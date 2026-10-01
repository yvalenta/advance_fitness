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

El arreglo está en `main` de la app: commits `b96295f` y `9d1cc8e`, rama
`polling-egress-supabase`. Pone el worker y el dispatcher de Solid Queue a
2 s y Cable en producción a `1.second`. La guarda
`spec/config/sondeo_supabase_spec.rb` cubre workers, dispatchers y Cable.
Lo que falta es de Yonatan: **mirar el Usage de la org** en el dashboard
(egress desglosado por servicio, sobre todo «Shared Pooler Egress»). La
sesión no tiene login en el dashboard y el MCP de Supabase no expone el
Usage. Las cifras de abajo son aritmética del protocolo, no medición de
Supabase.

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
| con el cambio, piso | 0,23 | 0,12 | 0,10 | **0,45** |
| con el cambio, techo | 0,61 | 0,41 | 0,14 | **1,16** |

El total de hoy no cuenta el egress del proyecto viejo de Resplandor, que
comparte la cuota.

El dispatcher sube a 2 s por decisión de Yonatan (2026-09-30). Solo mueve los
jobs con `wait:`; los recurrentes van directo a ready. El costo es que el
push del rest-timer (`NotificarDescansoJob`) puede llegar hasta ~4 s tarde:
2 s de dispatcher más 2 s de worker.

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
- 2026-09-30: decisión de Yonatan: el dispatcher también a 2 s (commit
  `9d1cc8e`; la guarda cubre workers y dispatchers, con prueba negativa:
  dispatcher en 1 → 3 examples, 1 failure). Suite: 1024 examples, 0 failures;
  rubocop sin ofensas; brakeman 0 warnings.
- 2026-09-30: Yonatan dio el GO de push y deploy y eligió desplegar todo
  `main` (incluye la progresión pendiente de `progresion-revision`).
  - Push de `main`: `859600c..9d1cc8e`, por fast-forward. GitHub avisó
    «Bypassed rule violations»: PR y 2 status checks, el bypass conocido.
  - Deploy: `kamal _2.12.0_ deploy` desde el worktree, con symlinks
    temporales a `master.key` y `.env`, que se borraron después. Exit 0 en
    377 s; el post-deploy salió en 0. Contenedor
    `advance_fitness_app-web-9d1cc8e…`. El log de Solid Queue confirma
    `polling_interval: 2` en el worker y el dispatcher.
- 2026-09-30, incidente del deploy: el worker nuevo no sondeó de 01:27:08 a
  ~01:42.
  - En `pg_stat_statements`, `solid_queue_pauses` se quedó en 48 586 993.
  - Los heartbeats del supervisor, el dispatcher y el scheduler quedaron
    clavados en 01:27:08.
  - Los 6 jobs encolados a las 01:30, 01:35 y 01:40 esperaron.
  - `pg_stat_activity` no mostraba nada bloqueado; todas las sesiones
    estaban `idle` en ClientRead.
  - Entre 01:40 y 01:45 se destrabó solo: corrieron los 6 jobs, y el
    supervisor reemplazó al dispatcher y al scheduler (exit 0, su registro
    había sido podado).
  - Hipótesis sin probar: conexiones al pooler abiertas a las ~01:27 que
    quedaron mudas (el worker viejo también dejó de sondear hacia 01:26:52)
    y que cayeron cuando venció el timeout de retransmisión TCP, que en
    Linux ronda los 15 min.
  - A las 02:00 se hizo un `docker restart -t 30` con GO de Yonatan. La
    sesión no volvió a medir antes de actuar, y para entonces ya no hacía
    falta. Costó ~13 s de 502 (02:00:06–02:00:19); `Release claimed jobs
    size: 0`, ningún job perdido.
- 2026-09-30: medición post-deploy en `pg_stat_statements`, ventana de 64,4 s
  (02:00:55 → 02:02:00 UTC). `solid_queue_pauses` +32 (**0,50/s**, antes
  8,93/s); `solid_queue_scheduled_executions` +32 (0,50/s, antes 0,98/s);
  `begin` 1,06/s (antes 9,98/s). La base entera pasó de 39 a 4,1
  sentencias/s, y quedan 0 ready executions pendientes. La parte medible del
  criterio de cierre se cumple. Falta el visto de Yonatan sobre el Usage de
  la org en el dashboard. El standby del homelab sigue en `b2cc9f8`, con
  sondeo a 0,1 s y sin la progresión; re-sincronizarlo (DEPLOY.md §4) no se
  hizo.
