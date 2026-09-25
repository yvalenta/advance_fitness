---
estado: en-curso
dueño: sesión
fecha: 2026-09-23
tema: los logros existen en catálogo, muro y landing pero nadie los otorga — motor de otorgamiento, vitrina, cola de no vistos y retroactivo silencioso
criterio_cierre: un miembro que cumple el criterio de un logro activo lo obtiene sin intervención (spec con dientes: falla sin el motor), lo ve en su vitrina y una sola vez como novedad; el primer deploy otorga lo ya ganado sin inundar /novedades; respeta `feature?("gamificacion")` del tenant; SDD actualizado antes del código; `dip test`, `dip rubocop` y `dip brakeman` en verde
---

Sale del backlog `2026-09-23-ideas-gymmane-workout-guide` (§1, ✔ comprobado a
mano): fuera de specs nadie crea un `LogroObtenido`, pero el muro
(`Comunidad::Muro`, /novedades) y la landing de autoservicio
(`landing/autoservicios/new.html.erb:93`) los prometen.

Trabajo en `~/Developer/worktrees/advance_fitness_app--logros`, rama
`tarea/logros` desde `origin/main` (hoy en `fe27d5b`).

Depende de `2026-09-23-perfil-juego-tenant-cambio`: un logro con puntos pasa
por `Juego::Otorgador` → `PerfilJuego#update!`, que hoy revienta tras un cambio
de gimnasio. Yonatan ya decidió (D1): el juego es de la persona. Ese arreglo
es el Paso 1 de esta misma rama.

## Diseño — el juego es de la persona y los logros se otorgan (Nota 28, Fase 21)

Decisiones de Yonatan (23-sep-2026), NO se reabren:
- D1. Puntos, racha y logros son **de la persona**: el perfil sigue a la cuenta al cambiar de gimnasio.
- D2. Con `gamificacion` apagada en el tenant **se otorgan igual y se esconden** (coherente con Nota 23g: apagar es presentación, no borrado).
- D3. Los PR del modo sesión no suman puntos (lo hace el carril de progresión, NO este).

## Paso 1 — el perfil sigue a la persona (cierra la tarea `perfil-juego-tenant-cambio`)
Hoy: `PerfilJuego` es uno por usuario con `tenant_id` desnormalizado (`hereda_tenant_de :user`,
`app/models/concerns/tenant_desnormalizado.rb`), y `User#estacionar_en!` (`app/models/user.rb:~130`)
cambia `users.tenant_id` sin tocar el perfil → todo `perfil.update!` posterior levanta RecordInvalid
(`Juego::Racha`, `Juego::Otorgador#actualizar_proyeccion`, `Juego::Recalculador`, `RecordatorioRachaJob`).
- `estacionar_en!` re-sincroniza `perfil_juego.tenant_id` al tenant nuevo en la misma transacción
  (si el perfil existe).
- **Privacidad al cambiar de gimnasio (fail-closed):** el opt-in del ranking (`visible_en_tabla`) y el
  consentimiento `logros_comunidad` del muro se dieron en el gimnasio viejo. Averiguá si `Consentimiento`
  está atado a un tenant. Un miembro NO puede aparecer en el ranking ni en el muro del gimnasio nuevo sin
  haber consentido ahí: si el consentimiento no distingue tenant, al cambiar de gimnasio `visible_en_tabla`
  pasa a false (y documentá qué pasa con el muro; si el muro usa un consentimiento global, filtralo por
  puesto/tenant o dejá el hallazgo anotado si excede — decidí con criterio y escribilo en la Nota).
- Migración de datos para los perfiles ya desfasados en producción: re-sincroniza `perfiles_juego.tenant_id`
  con `users.tenant_id` donde difieren (SQL con JOIN, reversible como no-op) aplicando la misma regla de
  privacidad (visible_en_tabla=false en los re-sincronizados).
- Spec con dientes (falla sin el arreglo): estaciona a un miembro en otro gimnasio DESPUÉS de crear su
  perfil, registra actividad (Racha/Otorgador) y corre `RecordatorioRachaJob` sin RecordInvalid; otro
  miembro detrás en el `find_each` sigue recibiendo su aviso.

## Paso 2 — motor de logros
Hechos: catálogo `logros` (global `tenant_id` nil + por tenant), `logros_obtenidos` único (user, logro) sin
`visto_en`, ledger `registros_puntos` con `TIPOS` que ya incluye "logro" y constraint única parcial
(user, tipo, origen) para idempotencia, `Juego::Otorgador.otorgar!(user, tipo:, puntos:, origen:, fecha:)`.
8 logros sembrados en `db/seeds.rb:~235` (codigo → criterio, por su descripción):
- `primera-sesion`: primer entrenamiento registrado (un `RegistroEntrenamiento` con algo hecho: ejercicio
  marcado en `ejercicios` jsonb o al menos un `DetalleEntrenamiento`). obtenido_en = esa fecha.
- `racha-7` / `racha-30`: `perfil.racha_mejor >= 7 / 30` (racha en días, `Juego::Racha`). obtenido_en: el
  momento de la evaluación que lo detecta (no se puede reconstruir la fecha exacta sin recorrer; si es
  barato reconstruirla desde las fechas del ledger, mejor).
- `primer-pr`: existe `RecordPersonal` con `baseline: false`. obtenido_en = fecha del primero.
- `10-checkins-mes`: ≥10 `Acceso` tipo checkin en un mismo mes calendario (zona America/Bogota).
  obtenido_en = fecha del 10º check-in de ese mes.
- `primera-medicion`: existe una `Medicion` del usuario. obtenido_en = su fecha. (El seed la categoriza
  "nutricion" siendo antropometría: corregí la categoría a "constancia" con una migración de datos
  idempotente SOLO si la fila conserva la categoría sembrada; el seed también.)
- `plan-completado-semana`: una semana lunes–domingo en la que TODOS los días programados del plan (usa
  `PlanPersonalizado#prescripcion_de(fecha)`: día con contenido, sin `movido_hacia`) tienen entrenamiento
  registrado. Si evaluarlo retroactivamente es caro, limitá a las semanas con actividad; documentá.
- `madrugador`: un check-in (`Acceso`) con hora local (America/Bogota) < 07:00. obtenido_en = esa fecha.
Categoría "social": sin fuente de eventos; no se siembra nada nuevo.

Diseño:
- `Juego::Logros` (PORO, sin Current): registro de criterios por `codigo` en Ruby (hash codigo → objeto con
  `evaluar(user) → nil | { obtenido_en:, contexto: }`). Un logro del catálogo sin criterio conocido (p. ej.
  uno creado por un tenant) no se otorga nunca — cosmético; documentalo.
- `Juego::OtorgadorLogros.evaluar!(user)`: para cada `Logro.activos` global o del tenant del usuario, con
  criterio conocido y aún no obtenido: si se cumple, crea `LogroObtenido` y, si `puntos > 0`, otorga
  `tipo: "logro"` por `Juego::Otorgador.otorgar!` con `origen: logro_obtenido` (idempotente por la
  constraint del ledger); `RecordNotUnique` en `LogroObtenido` = no-op. Actualiza `logros_count`.
- **Retroactivo silencioso sin fecha de corte:** si el `obtenido_en` derivado es anterior a AYER
  (`Date.current - 1`, zona de la app), el logro se crea con `visto_en: Time.current` y
  `contexto["retroactivo"] = true`. Lo ganado hoy o ayer entra como novedad (`visto_en: nil`). Así el primer
  deploy no inunda nada y no hace falta correr un rake antes de que llegue el primer evento.
- Columna nueva `logros_obtenidos.visto_en` (datetime, null) + índice parcial `(user_id) WHERE visto_en IS NULL`.
- Disparo (regla 14.12: jobs desde controllers, JAMÁS callbacks de modelo): `EvaluarLogrosJob(user_id)`.
  Encolalo donde ya se encola `OtorgarPuntosJob` (check-in, entrenamiento_completo — o al final de
  `OtorgarPuntosJob#perform`, lo que sea más limpio), cuando `Juego::DetectorPr` devuelve récords (en
  `DetallesEntrenamientoController#create`), y en `MedicionesController#create`. Red de seguridad nocturna
  en `config/recurring.yml` (patrón `recalcular_perfiles_juego`): evalúa a los usuarios con actividad en
  las últimas 24 h. El job se traga por usuario los errores esperables y no corta el lote.
- `gamificacion` apagada: el job evalúa igual (D2).

## Paso 3 — vitrina y cola de no vistos
- Ruta `resources :logros, only: :index` (miembro, `exigir_feature("gamificacion")`, Pundit con
  `verify_authorized`/policy_scope): vitrina propia con obtenidos (icono, nombre, fecha es-CO, puntos) y
  los no obtenidos del catálogo activo en gris con su descripción (sin porcentaje de progreso en v1).
  Visitarla marca `visto_en` en los no vistos del usuario. Reusá los componentes y tokens existentes
  (`shared/_racha.html.erb`, `card`, `eyebrow`, `badge-sm`, `font-display`).
- Novedad una sola vez: en el dashboard (junto a `shared/racha`, misma condición de feature) una card
  "¡Nuevo logro!" mientras haya no vistos, con enlace a la vitrina. Un punto en el enlace a la vitrina
  (desde perfil/hub de cuenta y dashboard) mientras haya no vistos.
- Muro (`/novedades`, `Comunidad::Muro`): con `gamificacion` apagada no pinta logros ni PR (hoy solo mira el
  flag `novedades`); excluye los `retroactivo`; solo `Logro.activos`.
- LogroObtenidoPolicy ya bloquea create/update/destroy y deja show al dueño o staff: respetala.

## Reglas de la casa que aplican
- SDD primero: Nota 28 en `advance-fitness-sdd.md` (después de la Nota 27, línea ~731, como nueva línea
  `>` + `> **Nota 28 (septiembre 2026) — Fase 21, …**`), y una fila "21" en la tabla de fases si existe
  el patrón. Luego el código.
- Español en dominio/UI, strong params, Pundit, controllers delgados, POROs en app/services sin Current.
- Tests RSpec (models, services, jobs, request specs, policies), fixtures YAML en test/fixtures.
- Commits con `git add <ruta>` explícita, nunca -A; mensaje en español en minúsculas como los del repo,
  terminando con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Integración a main (regla de Yonatan, 23-sep-2026)
Historia lineal, SIN commits de merge (el ruleset de GitHub lo exige): `git fetch
origin` → `git rebase origin/main` → suite verde → `git push origin HEAD:main`.
Si lo rechaza por non-fast-forward, otro rebase; jamás `--force` sobre main. Leer
la salida COMPLETA del push (sin `tail`) y reportar cualquier "Bypassed rule
violations". Contraejemplo: el merge `191c769` de `fallos-gymmane` entró por el
bypass y el aviso se perdió por filtrar la salida.

## Bitácora
- 2026-09-23: tarea declarada; worktree creado. Arranca el mapeo del motor de
  juego (catálogo, ledger, muro, novedades, feature flag) antes de diseñar.
- 2026-09-23 (cierre por contexto >200k): mapeo hecho (3 lectores); Yonatan
  decidió D1–D3 (arriba). Diseño escrito arriba, SIN código. Worktree
  `~/Developer/worktrees/advance_fitness_app--logros` en `fe27d5b` con
  `tailwind.css` ya compilado. Siguiente: Paso 1 (perfil de la persona, cierra
  `perfil-juego-tenant-cambio` en esta misma rama porque los logros dependen de
  él), luego Pasos 2 y 3, SDD primero. Correr la suite con base propia: ver
  `2026-09-23-progresion-revision.md` (§ Cómo correr la suite en un worktree).
  Refutador obligatorio al final (tenancy/privacidad + corrección).
