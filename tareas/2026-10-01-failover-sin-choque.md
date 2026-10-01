---
estado: en-curso
dueño: ambos
fecha: 2026-10-01
tema: standby tibio en el homelab (encendido, sin Solid Queue y sin túnel) que no pueda agotar el pooler de Supabase ni servir una segunda versión a la vez que Lightsail
criterio_cierre: medido con la base local del compose: un contenedor con SOLID_QUEUE_IN_PUMA apagado y sin tráfico abre 0 conexiones en ≥5 min, y el arranque no corre migraciones; en la rama, una guarda con spec que falla sin ella impide que una segunda instancia sirva o corra la cola mientras otra está viva; failover nuevo escrito en DEPLOY.md; dip test, dip rubocop y dip brakeman en verde; encender el standby tibio en el homelab es de Yonatan
---

Worktree ya creado: `~/Developer/worktrees/advance_fitness_app--failover-sin-choque`,
rama `tarea/failover-sin-choque` desde `origin/main` `664ec64`. Arrancar ahí
con `claude` → `/casa failover-sin-choque`.

## Decisión (Yonatan, 2026-10-01)

**Standby tibio**, que reemplaza al frío:

- El contenedor del homelab queda **encendido**, con `SOLID_QUEUE_IN_PUMA`
  apagado y con su `cloudflared-main` **detenido**.
- La razón: Rails solo abre conexiones a la base cuando llega tráfico, así
  que el standby ocuparía ~0 conexiones del pooler.
- Failover: parar el túnel y el contenedor de Lightsail, encender el túnel
  del homelab y activar la cola allá.

Esto todavía es una hipótesis: hay que medirlo antes de encender nada.

## Lo que hay que resolver o medir antes

1. **El entrypoint corre `db:prepare` al arrancar el server**
   (`bin/docker-entrypoint`). En el standby eso abre conexiones de sesión
   contra la base de producción y migraría con la imagen del standby.
   - Opciones: saltar `db:prepare` por variable de entorno en el standby,
     o verificar que es inocuo.
   - Riesgo: si el standby trae una migración que producción no tiene, la
     corre contra producción.
2. **¿De verdad 0 conexiones en reposo?** Medirlo con la base local del
   compose, en `pg_stat_activity`. Revisar initializers que toquen la base,
   el schema cache, Solid Cache y Solid Cable (el listener solo se crea
   con un suscriptor) y `/up` (`Rails::HealthController` no toca la base).
   **Jamás medirlo contra Supabase.**
3. **La cola en el failover.** ¿Se recrea el contenedor con
   `SOLID_QUEUE_IN_PUMA=true`, o se arranca `bin/jobs` aparte? ¿Qué pasa
   con los jobs reclamados por Lightsail si cayó a medias?
   (`solid_queue_processes` y `process_alive_threshold` los liberan.)
4. **Dos versiones a la vez.** Con el standby encendido, lo único que
   separa a las dos instancias es que su túnel esté apagado. Opciones para
   que no dependa de disciplina:
   - (a) un túnel por máquina y la ruta DNS a uno solo;
   - (b) una guarda de arranque/líder en la base (fila con host y
     heartbeat, o `solid_queue_processes` de otro host vivo);
   - (c) un `ops/failover.sh` que pare antes de arrancar y verifique.
5. **Mantenerlo sincronizado.** `ops/sincronizar_standby.sh` hoy crea el
   contenedor con `docker create` (detenido) y clona
   `SOLID_QUEUE_IN_PUMA` del viejo. Para el tibio tiene que crearlo sin la
   cola y decir cómo se enciende. Vuelve a ser una acción de Yonatan.

## Por qué hasta ahora era frío (evidencia, DEPLOY.md)

- **2026-08-06:** el homelab corriendo sin túnel ocupaba ~13 de las 15
  conexiones del pooler en modo sesión, y producción dio `EMAXCONNSESSION`.
- **Dos túneles arriba:** Cloudflare repartía el tráfico entre las dos
  versiones, y eso produjo el bug del tenant perdido.
- **2026-09-30:** en el deploy de `9d1cc8e`, Solid Queue quedó colgado
  ~15 min (tarea `egress-supabase-sondeo`). Posible pariente del pooler,
  sin probar.
- **Alternativas de fondo para el pooler, no elegidas:** Supavisor en modo
  transacción (6543) con `prepared_statements: false`, y sacar
  queue/cable/cache a SQLite local (evaluada en `egress-supabase-sondeo`).

**Límites:** encender el standby, tocar túneles/DNS y desplegar es lista 2
de la Línea Roja (Yonatan).

## Bitácora
- 2026-10-01: pedida por Yonatan («soluciona esto en worktree») sobre los
  dos incidentes de DEPLOY.md. Después Yonatan eligió el standby tibio
  («va»), y eso reemplaza el «déjalo frío» del mismo día. La sesión que la
  declaró estaba sobre los 200k: dejó el worktree creado y la tarea
  escrita, sin código.
