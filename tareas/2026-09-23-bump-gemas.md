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
