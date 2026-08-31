---
estado: hecha
dueño: ambos
fecha: 2026-08-31
tema: recrear el standby frío de fitness en el homelab (murió con el disco y la resurrección no lo recreó)
criterio_cierre: en la caja, docker ps -a muestra advance_fitness_app-web-<sha> en Created (jamás corriendo) con el env completo, y el sha del failover en DEPLOY.md actualizado
---

Descubierto el 2026-08-31 al intentar el patrón post-deploy: **el homelab no
tiene ningún contenedor de fitness** — el standby del 15-ago murió con el
disco (24-ago) y no estaba en la lista de la resurrección. DEPLOY.md ya lo
dice con fecha (la nota OJO en Arquitectura).

Lo que YA está hecho (medido):
- La imagen de producción transferida a la caja: tag `28b3f95…`, **1.05GB**
  (verificado con `docker image ls` allá).
- El script `sincronizar_standby.sh` copiado a `/tmp/` de la caja (y vive en
  `ops/` del repo).

Lo que falta y es TU decisión — la provisión de secretos: el script clona el
env **del contenedor viejo**, que ya no existe. Caminos posibles (el de
NomiCheck fue el primero):
1. **Camino directo prod→homelab** sin pasar por la Mac ni el chat:
   `ssh -A` a la caja y desde allá extraer el env del contenedor de
   producción de Lightsail (`docker inspect`), a un archivo temporal que
   muere tras el `docker create`.
2. Adaptar el script para leer un env-file que vos coloques a mano en la caja.

Con el env resuelto: `/tmp/sincronizar_standby.sh <n/a-sin-viejo> 28b3f95…`
necesitará el ajuste de "sin contenedor viejo" — o el camino 1 hace ambas
cosas de una. Regla intocable del script: `docker create`, JAMÁS `run`
(arrancarlo se come el pooler — incidente del 2026-08-06).

## Bitácora
- 2026-08-31: tarea creada; imagen transferida y script en posición; DEPLOY.md corregido (IP muerta → homelab.casa, y la verdad del standby ausente con fecha).
- 2026-08-31: **HECHA con GO ("recrea el standby con el camino directo")** — criterio medido: contenedor `…-web-28b3f95…` en **Created** (jamás corriendo), env de **13/13 variables** clonado del contenedor de producción por ssh caja→prod con agente reenviado (los secretos jamás pasaron por la Mac ni la sesión), y el sha del failover actualizado en DEPLOY.md. Verificación del runbook: 0 contenedores de fitness corriendo en la caja, producción intacta (302). Dos lecciones pagadas en el camino, ambas commiteadas: el agente de la Mac estaba VACÍO (el ssh directo usa la llave por archivo; hubo que `ssh-add` para que -A reenviara algo), y la versión warn-only del script creó un cascarón con CERO variables cuando el ssh falló — ahora aborta sin llaves críticas. El script ganó el modo `usuario@host:contenedor`.
