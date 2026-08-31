---
estado: en-curso
dueño: ambos
fecha: 2026-08-31
tema: puestos user↔tenant y selector de organización sin re-login (+ rol recepcion)
criterio_cierre: tabla puestos con backfill; verificar_pertenencia_al_tenant valida por puesto; handoff firmado entre subdominios con token de un solo uso (30s) y log append-only cambios_organizacion; specs de aislamiento cross-tenant extendidas y en verde
---

Del análisis del 2026-08-31: la app **ya es multi-tenant** (subdominio →
`Current.tenant`, Pundit con 30 policies, spec de aislamiento) — lo que
falta es la pieza N:M: hoy `User belongs_to :tenant` y un dueño de dos
gimnasios necesita dos cuentas.

Plan (archivos exactos en el informe):
1. Tabla `puestos` (`user_id`, `tenant_id`, `rol`, único por par) + backfill.
   NO llamarla membresías: `Membresia` ya es la del gimnasio.
2. `verificar_pertenencia_al_tenant` pasa de `tenant_id !=` a
   `puestos.exists?(tenant: Current.tenant)`, memoizado (pooler de 15
   conexiones); `Current.puesto` expone el rol vigente en ese tenant.
3. Selector en el navbar (solo con >1 puesto) → handoff firmado:
   `signed_id(purpose: :cambio_organizacion, expires_in: 30.seconds)`, de
   UN solo uso, canjeado en el subdominio destino por `start_new_session_for`.
   **Prohibido** cookie `domain: ".ynt.codes"` — filtraría sesión a todas
   las apps del apex.
4. Log append-only `cambios_organizacion` (user, de→a, ip, ua) — patrón
   readonly de consentimientos; también cuando superadmin entra a un tenant.
5. Rol `recepcion` (mostrador): registrar pagos/check-ins/renovaciones sin
   ser admin — revisar cada policy que hoy dice `staff?`.

Mockup de la página de Roles entregado con los tokens reales del tema
`advance` (DaisyUI, volt #b4f000).

## Bitácora
- 2026-08-31: tarea creada tras el análisis (la app ya tenía Pundit + aislamiento; lo nuevo es puestos, handoff y recepcion); CONSTELACION.md y CLAUDE.md del repo creados en la misma pasada.
- 2026-08-31: EN CURSO — arranca el rol `recepcion` (lo más chico con valor inmediato, GO de Yonatan). Los `puestos` y el handoff firmado quedan para la siguiente pasada.
- 2026-08-31: **rol `recepcion` HECHO** (commit `fdee982`, sin push: repo público). Cobra, registra check-ins, renueva membresías y da de alta miembros; no anula pagos, no asigna roles, no ve entrenamiento. NO entra en `staff?` (se agregó `mostrador?` y se revisó cada uso). Medido por esta sesión, no por el agente: **936 ejemplos, 0 fallas**, cobertura 94,43%; policies 115→142 ejemplos; rubocop sin ofensas, brakeman 0 warnings. Hallazgo de regalo: `PlanPersonalizadoPolicy::Scope` filtraba por una columna `aprobado` inexistente — reventaba para cualquier rol no-staff; arreglado. La tarea SIGUE EN CURSO: su criterio de cierre son los `puestos` y el handoff firmado, que no se tocaron.
