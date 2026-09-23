---
estado: en-curso
dueño: ambos
fecha: 2026-09-23
tema: backlog de la revisión de GymMane y workout-guide contra la app (fallos propios, riesgo de media Gym Visual, ideas a adoptar)
criterio_cierre: cada ítem de abajo queda hecho, en su propia tarea, o descartado con motivo en una Nota 29 del SDD (la 28 es la de logros); la decisión de Gym Visual la toma Yonatan
---

Revisión (23-sep-2026) de [InlitX/GymMane](https://github.com/InlitX/GymMane)
(Flutter, código GPL-3.0: solo ideas, jamás código ni sus `.arb` ni su mapeo de
arte) y [bryllim/workout-guide](https://github.com/bryllim/workout-guide)
(código MIT, 302 ejercicios × 3 frames SVG bajo CC BY-SA 4.0) contra
`advance_fitness_app/`. Mismo criterio que las Notas 26/27 del SDD (openGym).
Cada clasificación pasó por un comparador y un refutador; lo marcado ✔ lo
comprobé leyendo el código, el resto es lectura de agente, no verificado a mano.

## 1. Fallos propios (arreglar antes de sumar features)
- [x] Racha muerta encendida en dashboard y ranking → tarea `2026-09-23-racha-vigente`
      (commit `15b2077`, rama pusheada, falta merge). Su refutador destapó
      `2026-09-23-racha-fechas-futuras`.
- [x] ✔ Progresión congelada: arreglada por otra sesión (`1dcb0a6` + `c1dd50e`, merge
      `4c4d32f` en main, SIN desplegar). Revisión adversarial → tarea
      `2026-09-23-progresion-revision` (17 hallazgos, 1 alto; decisiones tomadas).
- [ ] → tarea `2026-09-23-logros-otorgados` (diseño hecho, sin código). ✔ Logros nunca otorgados: fuera de specs nadie crea un `LogroObtenido`,
      pero el muro y la landing (`landing/autoservicios/new.html.erb:93`) los
      prometen. Necesita motor + vitrina + cola de no vistos (`visto_en`) +
      otorgamiento retroactivo silencioso (si no, el primer deploy inunda /novedades).
- [ ] ✔ "al fallo" se registra como 1 rep: `sesion_controller.js:178`
      (`parseInt` → NaN → `|| 1`); contamina PR, 1RM y volumen.
- [x] ✔ `RecordatorioRachaJob` no mira `feature?("gamificacion")` del tenant (Nota 23g).
      → rama `fallos-gymmane`, mergeada en main (`191c769`, sin desplegar). Su spec destapó
      `2026-09-23-perfil-juego-tenant-cambio`. Aparte, previo y sin tocar: un
      tenant `activo: false` sigue recibiendo el push.
- [ ] → tarea `2026-09-23-json-plan-validador` (intento revertido por el
      refutador). ✔ `GestionPlanesController#update` (JSON avanzado) no pasa por
      `Ejercicios::ValidadorRutina.corregir!`: sin uid ni catálogo cerrado.
- [ ] Por lectura de agente: refresh en /sesion vuelve al ejercicio 1
      (`sesion_controller.js`, `this.actual = 0`); `Juego::MapaMuscular` da 0 al
      peso corporal y pinta una sola serie al 100%; la landing de campañas
      promete "equipamiento disponible" (`landing/campanas/show.html.erb:88`) sin respaldo.

## 2. Media del catálogo — DECISIÓN DE YONATAN (bloqueada)
- ✔ `NOTICE.md` de hasaneyldrm/exercises-dataset: la media es © Gym Visual con
  permiso escrito PROPIO del repo; "cloning this repo is not a license",
  "obtain your own license directly from Gym visual". La Nota 5 del SDD
  (sdd:683) asumió que nos cubría. Aun aceptándola, incumplimos "every use must
  carry © Gym visual": solo `ejercicios/ayuda.html.erb:44` pinta la atribución
  (faltan sesión, editor de día, índice, modal).
- Opciones: licencia directa con Gym Visual, o retirar la media (purga del
  volumen + deploy: aparca para Yonatan). El texto del dataset (MIT) no tiene riesgo.
- workout-guide como reemplazo parcial: 1:1 solo ~78 de 1.324 filas (~6%);
  mapeo curado a mano del núcleo (33 plantillas de seeds + lo que usa
  `catalogo_para_prompt`) sube bastante. SVG = `<path fill="#fff">` → invisibles
  sobre `bg-white`: usar CSS `mask-image` con el color del tenant (archivo
  intacto, no es adaptación). ~26 MB todos: vendorizar solo lo mapeado y
  sanear (sin CSP). Página /creditos (Bryl Lim, CC BY-SA 4.0 + enlace,
  Everkinetic en 76 frames, aviso MIT de hasaneyldrm). Revierte la Nota 5 →
  SDD primero. `importador_dataset.rb:44-46` reescribe media y atribución en
  cada corrida de `tenant.rake`: blindarlo.

## 3. Ideas que encajan (gimnasio↔entrenador↔miembro)
- S/alto: nivel y "cuánto falta" visibles al miembro (hoy solo en el ranking
  opt-in; umbral n²·100); pitido WebAudio al fin del descanso (iOS no vibra);
  recordatorio anclado al día del plan ("Hoy toca pierna"), sin avisar en
  descanso; marcador "medición pendiente" >30 días (Flujo C del SDD, deuda) + lista para staff.
- M, sesión: saltar ejercicio y volver (máquina ocupada); deshacer serie;
  stepper de kg/reps reales prellenado (Nota 23a); tipos de serie PRESCRITOS
  por el staff en `CAMPOS_EJERCICIO`; incremento de progresión por ejercicio;
  mapa muscular por series vs. lo prescrito; curva de fuerza e historial por
  ejercicio; el miembro ve la curva de las medidas que toma el staff;
  compartir logro/racha como imagen (canvas + `navigator.share`, §18.5 sin Meta API).
- L / decisión: inventario de equipo por gimnasio (filtra prompt de IA y
  alternativas) + preajustes por miembro para tenants entrenador/influencer;
  fotos de progreso (revertir Nota 22c; storage local sin respaldo → gasto →
  Yonatan); Habeas Data: falta la autorización de tratamiento en el registro;
  supresión de cuenta compleja (usuario global con puestos).
- Descartadas: notificación en vivo nativa, import Hevy/Strong (Nota 26),
  multi-idioma, widgets nativos, sesión libre sin plan, meta semanal del
  miembro (la fija el plan), bloqueo anti-toques, cuenta regresiva de inicio.

## Bitácora
- 2026-09-23: revisión con workflow (6 comparadores sonnet + 6 refutadores de
  la casa, 81 ideas + 21 omitidas); fallos ✔ comprobados a mano en el código.
  Racha arreglada en su propia tarea; progresión en otra sesión.
- 2026-09-23 (sesión 2): recordatorio de racha respeta `gamificacion` del
  tenant parado → rama `fallos-gymmane` (suite 1008/0, rubocop limpio,
  brakeman 0 warnings vía `bundle exec brakeman` porque `bin/brakeman` aborta
  por `--ensure-latest`; spec con dientes: falla sin el fix; refutador sin
  hallazgo en la racha). El intento del JSON del staff con `corregir!` se
  revirtió (4 hallazgos, 2 altos) → `2026-09-23-json-plan-validador`. Nuevo
  fallo previo → `2026-09-23-perfil-juego-tenant-cambio`. La progresión ya
  tiene fix en `claude/modest-hugle-9ef1c8` (`1dcb0a6`, sin mergear, sin
  revisar acá). Siguen: logros, "al fallo" (necesita decidir la UX: stepper
  de reps reales, Nota 23a, o no registrar la serie — el modelo exige reps ≥1
  y `registrar_cumplido!` también fuerza 1), ítems por lectura de agente.
- 2026-09-23 (sesión 3): progresión revisada con workflow → `progresion-revision`;
  logros diseñados → `logros-otorgados`; Yonatan decidió: mesociclo como está, PR
  de sesión sin puntos, juego de la persona, logros se otorgan con gamificación
  apagada. Cierre por contexto >200k, sin código nuevo.
