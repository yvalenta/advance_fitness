---
estado: en-curso
dueño: yonatan
fecha: 2026-09-30
tema: el sondeo de Solid Queue y Solid Cable a 0,1 s se comía la cuota de egress Free de la org de Supabase
criterio_cierre: rama polling-egress-supabase integrada a main de la app y desplegada; en pg_stat_statements, solid_queue_pauses crece ≤0,6 llamadas/s en una ventana ≥60 s (hoy 8,9/s); y el Usage de la org muestra el egress del pooler bajando (visto de Yonatan)
---

La org de Supabase de la app (`bekzzgqqzmyglwevvwyf`, plan Free; proyecto
`egmovgftytzotwtceqdr`, us-east-2) es la misma del Supabase viejo de
Resplandor, y quedó restringida por `exceed_egress_quota` (la API respondía
402, según la sesión que migró Resplandor). Producción usa una sola base
física de Supabase para primary, queue, cable y cache, y entra por el pooler
Supavisor. Con el default del generador, el worker de Solid Queue sondeaba
cada 0,1 s, y cada vuelta hace 4 viajes (BEGIN, `solid_queue_pauses`,
`solid_queue_ready_executions`, COMMIT). El listener de Solid Cable sondeaba
también cada 0,1 s mientras hubiera una pestaña suscrita, y el navbar de
entrenador/admin siempre lo está.

El arreglo está en la rama `polling-egress-supabase` de la app, commit
`b96295f`, sin pushear ni desplegar. Pone el worker a 2 s y Cable en
producción a `1.second`, y agrega una guarda en
`spec/config/sondeo_supabase_spec.rb`. Lo que falta es de Yonatan:

1. **Mirar el Usage de la org** en el dashboard (egress desglosado por
   servicio, sobre todo «Shared Pooler Egress»). La sesión no tiene login
   en el dashboard y el MCP de Supabase no expone el Usage. Las cifras de
   abajo son aritmética del protocolo, no medición de Supabase.
2. Integrar a `main` (rebase + fast-forward) y **desplegar con Kamal**.
   Desplegar está en la lista 2 de la Línea Roja.

### La cuenta (estimación; falta confirmarla en el dashboard)

Ritmo medido el 2026-09-30 con dos fotos de `pg_stat_statements` separadas
60,9 s (01:03:47 → 01:04:48 UTC): `solid_queue_pauses` subió de +544 (worker
a **8,93 vueltas/s**); `solid_queue_scheduled_executions` subió de +60
(dispatcher a 0,98/s); `begin` subió de +608; el total de sentencias de la
base iba a 39/s. Cable dio 0 en esa ventana porque no había nadie suscrito.
Su promedio desde el `stats_reset` (2026-07-05, 88 días) es 2,27 vueltas/s,
o sea ~23 % del tiempo con un listener activo a 0,1 s.

Bytes por vuelta, servidor→cliente, en el protocolo de Postgres:

| proceso | bytes | cómo se arman |
|---|---|---|
| worker | ~179 | BEGIN 17 + pauses 66 + ready 78 + COMMIT 18 |
| dispatcher | ~92 | |
| cable | ~165 | una sola sentencia, con un RowDescription de 5 columnas |

Hay dos cotas porque no se sabe con qué unidad mide Supabase el egress del
pooler:

- **Piso:** solo el payload del protocolo.
- **Techo:** el payload más 74 B por respuesta (TLS 1.3, 22 B, y TCP/IPv4
  con timestamps, 52 B). Supone que la conexión va con TLS, y eso no está
  verificado.

GB por cada 30 días:

| | worker | dispatcher | cable | total |
|---|---|---|---|---|
| hoy, piso | 4,14 | 0,23 | 0,97 | **5,34** |
| hoy, techo | 10,99 | 0,80 | 1,41 | **13,2** |
| con el cambio, piso | 0,23 | 0,23 | 0,10 | **0,56** |
| con el cambio, techo | 0,61 | 0,80 | 0,14 | **1,55** |

El total de hoy no cuenta el egress del proyecto viejo de Resplandor, que
comparte la cuota.

Con el cambio, el dispatcher (1 s) queda como el sumando más grande. Subirlo
a 2 s ahorra ~0,1 GB (piso) o ~0,4 GB (techo). El costo es que el push del
rest-timer (`NotificarDescansoJob`, único job con `wait:`) llegaría hasta
~1 s más tarde. No se tocó, y la decisión queda para Yonatan.

### Alternativa evaluada, no hecha: sacar queue/cable/cache de Supabase

La opción es moverlas a SQLite en el volumen `advance_fitness_app_storage`,
que ya existe en `config/deploy.yml`, o a un Postgres del host.

- **A favor:** el egress de las tres baja a 0. Además libera hasta 10 de las
  15 conexiones del pooler en modo sesión (pools queue 6, cable 2, cache 2),
  y el `EMAXCONNSESSION` ya mordió en agosto (DEPLOY.md).
- **En contra:** hay que agregar la gema `sqlite3` y tocar `database.yml` y
  el deploy. El failover al homelab arrancaría con la cola vacía (los jobs en
  vuelo se pierden; los recurrentes se rearman solos). Tampoco hace falta para
  salir de la cuota.

Si se quiere, va como tarea propia después de ver el efecto de este cambio.

## Bitácora
- 2026-09-30: medido el ritmo en `pg_stat_statements` vía el MCP de Supabase
  (solo SELECT). El dashboard pidió login y quedó sin abrir. Commit `b96295f`
  en `polling-egress-supabase` (app).
  - `dip test`: 1023 examples, 0 failures.
  - `dip rubocop`: 409 archivos, sin ofensas.
  - `dip brakeman`: 0 warnings (1 ignorado, el de siempre).
  - Prueba negativa: con los dos valores de vuelta a 0.1 la spec nueva da
    2 examples, 2 failures; restaurados, 2 examples, 0 failures.
  - `SolidQueue::Configuration` arma `worker polling_interval=2`.
