---
estado: en-curso
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
