---
estado: hecha
dueño: sesión
fecha: 2026-09-23
tema: actualizar las gemas atrasadas de la app y aprovechar lo que traigan los bumps
criterio_cierre: `bundle outdated` sin atrasos fuera de los que la bitácora justifique; un commit por bump (o grupo afín) con `dip test`, `dip rubocop` y `dip brakeman` en verde; las ramas dependabot cubiertas, cerradas; cada feature nueva adoptada con su nota en el SDD, y las que cambian comportamiento visible con visto de Yonatan
---

Pedido de Yonatan (2026-09-23): "actualiza las gemas antiguas y verifica si
podemos mejorar cosas con features recientes incluidos en los bumps". En la
app (`advance_fitness_app/`, repo propio, remoto yvalenta/advance_fitness_app).

Punto de partida (medido 2026-09-23 sobre main 4c4d32f — `bundle outdated`
todavía NO se corrió):
- Ramas dependabot abiertas en origin: bootsnap 1.26.0, image_processing
  2.1.0, omniauth-google-oauth2 1.2.3, simplecov 1.3.0, solid_queue 1.7.0
  (lock en 1.4.0 — el salto más grande, leer su changelog: jobs, recurring,
  concurrencia), thruster 0.1.26 (lock 0.1.23), selenium-webdriver 4.46.0
  (de julio). brakeman-8.0.6 ya lo cubrió main (c5e05c4): cerrar esa rama.
- Versiones clave del lock: rails 8.1.3.1, kamal 2.12.0, tailwindcss-rails
  4.6.0, importmap-rails 2.2.3, stimulus-rails 1.3.4, propshaft 1.3.2,
  pundit 2.5.2.

Cuidados:
- Rails 8.1 / Ruby 4.0 / Postgres 17 son decisión CERRADA (SDD §12): un
  salto de minor de Rails o Ruby se propone a Yonatan y va al SDD antes del
  código; patches sí entran.
- Sin Node ni package.json (importmap). Sin Redis (Solid *).
- Un bump de solid_queue puede traer migraciones de sus tablas: revisar y
  anotar que el próximo deploy las corre. Deploy = Kamal, es de Yonatan.
- Entorno de un worktree fresco: `dip rails tailwindcss:build` antes de los
  request specs (tailwind.css gitignoreado); los 5 specs de push piden
  `-e VAPID_PUBLIC_KEY=placeholder -e VAPID_PRIVATE_KEY=placeholder`; la
  base de test es compartida entre worktrees (esperar a que no haya otro
  `advance_fitness_app-web-run-*`); jamás `bash -c "a && b"` vía dip;
  jamás copiar `.env` (DEV_DATABASE_URL = Supabase de producción).

## Bitácora
- 2026-09-23: declarada. La sesión que la recibió estaba sobre el umbral de
  contexto (regla de corte de /casa) y no la empezó.
- 2026-09-23: tomada por una sesión fresca (/casa bump-gemas). Worktree
  `~/Developer/worktrees/advance_fitness_app--bump-gemas`, rama
  `tarea/bump-gemas` desde origin/main fe27d5b.
- 2026-09-23: avanzada; la sesión cortó por la regla de 200k (222k). Todo
  en la rama local `tarea/bump-gemas` (worktree
  `~/Developer/worktrees/advance_fitness_app--bump-gemas`, SIN merge ni push).
  Commits verdes: 4b8cfad thruster 0.1.26 (#66) · ef3f2bf bootsnap 1.26
  (#71) · e7f8b34 image_processing 2.1.0 (#69; ≥2.0.3 cierra un RCE) ·
  8501598 omniauth-google-oauth2 1.2.3 (#68; verifica la firma del ID token)
  · 8ceffaa selenium 4.49 + simplecov 1.3 (#44, #72) · 42e6185 rubocop 1.91
  · 7eeba79 parches (rack, faraday, erb, zeitwerk, net-*, Tailwind 4.3.3) ·
  8b58c61 `:unprocessable_entity` → `:unprocessable_content` (28 usos). Sobre
  7eeba79: dip test 1020 ejemplos/0 fallos, rubocop 407 archivos sin
  ofensas, brakeman 0 warnings, bundler-audit sin vulnerabilidades; sobre
  8b58c61: 1020/0 y 0 warnings de Rack. brakeman #64 ya lo cubría main.
  Decisiones de Yonatan (hoy): la escalera de las 4am pasa a 4am de Bogotá
  (solid_queue ≥1.5 lee los recurring sin zona en config.time_zone; en UTC
  corría a las 11pm de Bogotá del día anterior) y se agrega la migración de
  batches (1.7). Ambas en bcd6324 (WIP): solid_queue 1.7.0 (#67),
  recurring.yml con America/Bogota explícito, db/queue_migrate/20260923200539
  + queue_schema.rb 1.7 (ensayado en local con tmp/bump/ensayo_batches.rb:
  migrar el esquema 1.4 dos veces == cargar el nuevo), spec
  spec/config/recurring_spec.rb, README y SDD Nota 28.
  **Falta, para una sesión fría:** (1) arreglar recurring_spec.rb:21 — sale
  ROJO con TypeError porque Configuration#warn_about_missing_config_files
  hace Pathname.new del `recurring_schedule_file` y el spec pasa un Hash:
  escribir la sección production a un Tempfile YAML y pasar la ruta (el
  ejemplo :27 de la escalera ya sale verde); (2) prueba negativa: una clase
  mal escrita pone rojo :21 y un `4am UTC` pone rojo :27; (3) dip test
  completo + rubocop + brakeman y reescribir bcd6324 sin el "WIP"; (4) merge
  a main, push y cerrar los PRs de dependabot #44 #64 #66 #67 #68 #69 #71 #72
  con el sha; desmontar el worktree. Para Yonatan: el próximo deploy de
  Kamal corre la migración de batches en la base de cola (Supabase).
  No adoptado a propósito: json 3.0 (rechaza claves duplicadas y
  GeneradorPlanIa/GeneradorFeedbackIa parsean salida de LLM con JSON.parse;
  pide decidir allow_duplicate_key); marcel 2 y diff-lcs 2 (topados por
  Rails y rspec). Ojo entorno: hacia las 15:10–15:25 OrbStack trabó la
  creación de contenedores (un `docker run alpine echo` tardó 2:57); se
  recuperó solo.
- 2026-10-03: obrero fresco; cerrado lo que era de la rama, queda lo de Yonatan.
  Rama `tarea/bump-gemas` del repo de la app (worktree
  `~/Developer/worktrees/advance_fitness_app--bump-gemas`, SIN merge ni push),
  rebasada sin conflictos sobre main local 664ec64: 10 commits, 0 detras de
  main. Los shas de arriba cambiaron por el rebase: 8018e71 thruster · b458924
  bootsnap · 4c354e8 image_processing · e5b0ec9 omniauth · ac643ce selenium +
  simplecov · b4224c5 rubocop · c8b553d parches · a4dcc2a 422 · 3adf71c
  solid_queue 1.7.0 (ex-WIP bcd6324, mensaje reescrito sin "WIP") · effe982
  brakeman 8.1.0. Hecho: (1) recurring_spec arreglado: escribe la seccion
  production a un Tempfile YAML y pasa la ruta; ademas afirma que el scheduler
  cargo las tareas (un YAML vacio validaba en vacio) y llama a valid? antes
  del expect (el mensaje de be_valid salia vacio). Los ejemplos pasaron de
  :21/:27 a :26/:39. (2) Pruebas negativas, cada una con el archivo tocado y
  restaurado: sobre el spec original `2 examples, 1 failure` en :21 con
  `TypeError: Pathname.new requires a String, #to_path or #to_str`; clase
  VencerMembresiaJob -> `Invalid recurring tasks:\n- vencer_membresias: Class
  name doesn't correspond to an existing class`; `4am UTC` -> `got: ...
  vencer_membresias: "23:00"` vs `expected ... "04:00"` en :39; Tempfile
  vacio -> rojo en la afirmacion de tareas cargadas. Verde: `2 examples, 0
  failures`. (3) `dip test` (sobre 3adf71c): `1026 examples, 0 failures`
  (3 min 41.3 s, cobertura 94.95%); `dip rubocop`: `411 files inspected, no
  offenses detected`. Brakeman: `bin/brakeman` usa --ensure-latest y con 8.0.6
  `dip brakeman` salia con exit 5 sin escanear ("Brakeman 8.0.6 is not the
  latest version 8.1.0"; main tambien); el escaneo directo con 8.0.6 dio
  `Security Warnings: 0`; bumpeado a 8.1.0 (effe982, solo cambia Gemfile.lock):
  `Errors: 0`, `Security Warnings: 0`, `Ignored Warnings: 1`, exit 0. La suite
  NO se re-corrio tras effe982 (gema de desarrollo, solo lock). Medido tambien
  `dip bundle outdated` (primeras 30 filas) sobre el arbol final: ya no esta
  al dia con lo del 23-sep: rails y sus 11 gemas 8.1.3.1 -> 8.1.4 (patch,
  entra), image_processing 2.2.0, selenium 4.50.0, simplecov 1.3.2, pg 1.7.0,
  solid_cable 4.1.0, net-smtp 0.5.2, parallel 2.3.0, rdoc 8.1.0,
  regexp_parser 2.13.1; json 3.0.2, marcel 2.1.0 y diff-lcs 2.0.0 siguen sin
  adoptar a proposito. Faltan, para una sesion fria tras el merge: un segundo
  barrido de bumps (patch de Rails 8.1.4 primero) y la adopcion de features
  con su nota en el SDD. APARCA PARA YONATAN (desbloquea: Yonatan): merge de
  `tarea/bump-gemas` (app) a main, push, cerrar los PRs de dependabot #44 #64
  #66 #67 #68 #69 #71 #72 con el sha del merge (#64 brakeman 8.0.6 queda
  obsoleto por effe982), desmontar los worktrees, y mergear esta misma tarea
  (rama `tarea/bump-gemas` del repo exterior). Para el deploy de Kamal: corre la
  migracion de batches en la base de cola (Supabase). Es de dependencias y
  cola: no toca autorizacion, tenencia, dinero ni identidad.
- 2026-10-05: visto de Yonatan: mergeada a main de la app (466365c..effe982) y del exterior (39cfc4b..17298c8); suite 1067/0 con rubocop y brakeman en verde sobre la cadena bump-gemas → perfil-juego. Push, cierre de los PRs de dependabot y el deploy (migración de batches en la cola) los hace Yonatan; el segundo barrido de bumps (Rails 8.1.4, pg 1.7.0, solid_cable 4.1.0…) es tarea aparte → hecha.
