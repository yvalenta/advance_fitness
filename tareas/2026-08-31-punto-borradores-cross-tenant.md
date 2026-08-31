---
estado: hecha
dueño: sesión
fecha: 2026-08-31
tema: cerrar la fuga de existencia del punto de borradores y el stream global planes_pendientes
criterio_cierre: conteo del partial scopeado por tenant (fail-closed sin Current), broadcasts y suscripciones por el par [tenant, "planes_pendientes"], specs de acción cruzada que muerden, y suite completa en verde — commiteado en main con visto de Yonatan
---

Residuo declarado al cerrar la tarea de puestos (`28b3f95`, tareas/2026-08-31-puestos-y-selector-organizacion.md):
el partial `shared/_punto_borradores.html.erb` contaba con
`PlanPersonalizado.pendientes.exists?` crudo — el staff del gimnasio A veía
el punto encendido por un borrador del gimnasio B — y el modelo difundía la
cola por el stream GLOBAL `planes_pendientes`, al que se suscribían el
navbar y la cola del entrenador de TODOS los tenants.

Arreglo (en el repo anidado `advance_fitness_app`): scope
`PlanPersonalizado.del_tenant` por puesto del dueño (mismo criterio que
`ApplicationPolicy::Scope#del_tenant`, fail-closed con tenant nil); el
partial recibe `tenant:` explícito desde los broadcasts (ahí no hay
`Current`) y cae a `Current.tenant` desde el navbar; los tres broadcasts
difunden al par `[tenant, "planes_pendientes"]` por cada gimnasio donde el
dueño del plan tiene puesto; navbar y cola se suscriben con el mismo par.

## Bitácora
- 2026-08-31: arreglo COMPLETO y verificado en el worktree
  `advance_fitness_app/.claude/worktrees/pensive-yalow-21d73e` (rama
  `claude/gifted-lumiere-538bf2`, base `28b3f95`, SIN commitear por regla de
  la tarea). Medido por la sesión: **1007 ejemplos, 0 fallas** (997 base +
  10 nuevos con dientes: modelo — difusión por tenant en ambas direcciones,
  nada por el stream global, punto renderizado sin Current, dueño con dos
  puestos difunde a ambas colas, scope fail-closed; requests — punto apagado
  ante pendiente ajeno, suscripciones firmadas por tenant, caso sumado a
  aislamiento_acciones_cruzadas); cobertura 94,67%; rubocop sin ofensas;
  brakeman 0 warnings. El spec del punto se verificó ROJO contra el código
  viejo antes de dejar el arreglo. `origin/main` (`cf591a2`) solo movió
  DEPLOY.md y ops/ — cero solape, aplica limpio. Bloqueada: la desbloquea
  Yonatan (revisar el diff del worktree y commitear a main).
- 2026-08-31: **HECHA** — Yonatan revisó el diff y dio el GO; merge `882dfc2` (un commit limpio, sin arrastres del worktree viejo) verificado por la sesión principal con la suite completa sobre main fusionado: **1007 ejemplos, 0 fallas, 94,67%**. Pusheado a origin. El fix llega a producción con el próximo `kamal deploy`.
- 2026-08-31: **DESPLEGADO con GO de Yonatan** («corre kamal deploy»): `bin/kamal deploy` verde en **51,8s** — contenedor nuevo `advance_fitness_app-web-882dfc2a…` healthy con el sha exacto del merge, drain de 130s del viejo, prune ok, y el hook post-deploy (PR #59) en exit 0, que exige 200 público en `https://advance-fitness-app.ynt.codes/up` — verificado en vivo, no solo el contenedor. Sin tropiezos conocidos (locale UTF-8 aplicado, buildkit sano). Limpieza previa de la misma pasada: worktree `pensive-yalow-21d73e` y rama `claude/gifted-lumiere-538bf2` eliminados (fusionada), y la rama huérfana `claude/pensive-yalow-21d73e` borrada tras verificar diff VACÍO contra main de sus 4 archivos (su contenido —Rails 8.1.3.1/CVE-2026-66066 y CI— ya estaba en main vía `a60e112`, PR #59).
- 2026-08-31: **desplegado a producción** (`kamal deploy` verde en 115,7s, contenedor `882dfc2` Up, pública 302) y el standby traído a paridad por el camino directo en el mismo movimiento (Created, 13/13 variables, viejo removido; failover del runbook actualizado). El punto de borradores por tenant está SIRVIENDO.
