---
estado: propuesta
dueño: ambos
fecha: 2026-09-23
tema: backlog de la revisión de GymMane y workout-guide contra la app (fallos propios, riesgo de media Gym Visual, ideas a adoptar)
criterio_cierre: cada ítem de abajo queda hecho, en su propia tarea, o descartado con motivo en una Nota 28 del SDD; la decisión de Gym Visual la toma Yonatan
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
- [ ] ✔ Progresión congelada tras el primer +2.5 kg: `SesionesController#peso_para_registrar`
      prioriza "la vez pasada" sobre `peso_sugerido_kg` y el guard de
      `Progresion::Regla` (regla.rb:50) no vuelve a disparar. **La tomó otra
      sesión (worktree `claude/*`, "Fix session weight ignoring raised suggested
      weight")**: revisar su diff; el spec `sesiones_controller_spec.rb:130`
      ("la vez pasada, no el sugerido") protegía el fallo.
- [ ] ✔ Logros nunca otorgados: fuera de specs nadie crea un `LogroObtenido`,
      pero el muro y la landing (`landing/autoservicios/new.html.erb:93`) los
      prometen. Necesita motor + vitrina + cola de no vistos (`visto_en`) +
      otorgamiento retroactivo silencioso (si no, el primer deploy inunda /novedades).
- [ ] ✔ "al fallo" se registra como 1 rep: `sesion_controller.js:178`
      (`parseInt` → NaN → `|| 1`); contamina PR, 1RM y volumen.
- [ ] ✔ `RecordatorioRachaJob` no mira `feature?("gamificacion")` del tenant (Nota 23g).
- [ ] ✔ `GestionPlanesController#update` (JSON avanzado) no pasa por
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
