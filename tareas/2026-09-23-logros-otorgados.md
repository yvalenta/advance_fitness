---
estado: en-curso
dueño: claude
fecha: 2026-09-23
tema: los logros existen en catálogo, muro y landing pero nadie los otorga — motor de otorgamiento, vitrina, cola de no vistos y retroactivo silencioso
criterio_cierre: un miembro que cumple el criterio de un logro activo lo obtiene sin intervención (spec con dientes: falla sin el motor), lo ve en su vitrina y una sola vez como novedad; el primer deploy otorga lo ya ganado sin inundar /novedades; respeta `feature?("gamificacion")` del tenant; SDD actualizado antes del código; `dip test`, `dip rubocop` y `dip brakeman` en verde
---

Sale del backlog `2026-09-23-ideas-gymmane-workout-guide` (§1, ✔ comprobado a
mano): fuera de specs nadie crea un `LogroObtenido`, pero el muro
(`Comunidad::Muro`, /novedades) y la landing de autoservicio
(`landing/autoservicios/new.html.erb:93`) los prometen.

Trabajo en `~/Developer/worktrees/advance_fitness_app--logros`, rama
`tarea/logros` desde `origin/main` (`4c4d32f`).

Depende de una decisión abierta en `2026-09-23-perfil-juego-tenant-cambio`:
¿los puntos (y los logros) son de la persona o de cada gimnasio? Un logro con
puntos pasa por `Juego::Otorgador` → `PerfilJuego#update!`, que hoy revienta
tras un cambio de gimnasio.

## Bitácora
- 2026-09-23: tarea declarada; worktree creado. Arranca el mapeo del motor de
  juego (catálogo, ledger, muro, novedades, feature flag) antes de diseñar.
