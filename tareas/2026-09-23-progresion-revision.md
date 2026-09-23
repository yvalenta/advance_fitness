---
estado: en-curso
dueño: ambos
fecha: 2026-09-23
tema: revisión adversarial de la progresión ya mergeada en main (1dcb0a6 + c1dd50e, merge 4c4d32f) — NO desplegada (prod = c5e05c4/b2cc9f8)
criterio_cierre: cada hallazgo nuevo de abajo queda arreglado con spec que falla sin el arreglo, o decidido/descartado con motivo en el SDD (Nota 27); Yonatan decide el deploy de la progresión con este resultado
---

Revisión con workflow (4 refutadores por dimensión + verificadores por
hallazgo, 2 lentes para media/alta): 21 hallazgos, 17 sobreviven. Lo marcado ✔
lo comprobé leyendo el código a mano.

## Nuevos con este cambio
- [ ] ✔ **Fin del mesociclo = regla apagada para siempre.** Fuera de rango,
      `numero_semana_de` cae a `semana_actual`, que clampea a la última semana, y
      esa semana SIEMPRE es de descarga (`ValidadorRutina::SEMANAS_DEFAULT`, prompt
      IA). Entonces `prescripcion.descarga?` corta la regla (`regla.rb:41`). La
      raíz ya existía (Fase 14.7: "terminado el ciclo, la última" → la sesión
      muestra el 0.85 para siempre); lo nuevo es que la regla lo respeta.
      **Decisión de Yonatan**: ¿qué pasa al terminar el mesociclo?
- [ ] ✔ **Reprogramar un día ya entrenado vuelve a disparar la regla** (3
      refutadores por separado, 2/2 votos): `ReprogramacionDia` no mira si
      `fecha_original` ya tiene series. El destino muestra el contenido con el
      sugerido nuevo, lo registra otra vez → +2.5 y 2 PR (60 pts) por vuelta.
      Se puede borrar y re-mover. Solo con la UI.
- [ ] **Semana más pesada con `reps_delta` negativo nunca progresa**
      (`mas_liviana?` compara el piso de reps contra la base, `regla.rb:84`). La
      Nota 27f lo daba por defecto del código viejo y 27g lo reproduce. Solo pega
      a planes IA (el default tiene reps_delta 0).
- [ ] **Feature `ciclo` apagada y la regla igual frena en menstrual/lútea**
      (`plan_personalizado.rb:288`, `Ciclo::Fase.para` sin `feature?`). El
      recorte en la sesión ya existía.
- [ ] **PR automáticos por la progresión**: cada +2.5 y cada semana 1.05/1.1
      fabrican 2 PR (peso_max + volumen_max = 60 pts) al primer tap, sin que el
      miembro confirme el peso. Es consecuencia de 27f ("el peso del plan
      confirmado cuenta como real"); impacta ranking y logros (`primer-pr`
      trivial). **Decisión de producto.**
- [ ] Baja: la re-visita del día pinta el kg nuevo en ejercicios ya hechos y
      el volumen del resumen usa ese kg; los specs no protegen los ejes
      series/reps de `mas_liviana?` ni de `baja_carga?`.

## Previos (no los trajo este cambio)
- Mismo `ejercicio_id` dos veces en un día (pesada + back-off): las series se
  cruzan por `(ejercicio, serie)` y la regla de B cuenta las de A
  (`detalles_entrenamiento_controller.rb:22`, índice sin uid). Media.
- `aplicar_incremento!` pone 2.5 kg a copias del uid sin peso (`regla.rb:109`).
- Corporal (sugerido 0) registra el kg de "la vez pasada" de otra variante.
- Ejercicio por tiempo: volver tarde a la app infla los segundos → PR de reps.
- Se pierde el POST de una serie intermedia → el día no se completa nunca.

## Suite en origin/main (4c4d32f)
rubocop 0 ofensas, brakeman 0 warnings. `dip test` 1020/162, pero son del
entorno del worktree nuevo: 156 `tailwind.css` sin compilar y 6 de push (falta
`config/master.key`, no versionada). CI de 4c4d32f: test verde (el rojo era
bundler-audit por json, ya cerrado en fe27d5b).

## Decisiones de Yonatan (23-sep-2026)
- Fin del mesociclo: **se queda como está** (descarga y regla apagada hasta
  que el staff renueve). Solo se escribe en el SDD (Nota 27h), sin código.
- PR del modo sesión: **récord sí, puntos no**. `Juego::DetectorPr.evaluar!`
  gana `puntos:`; la sesión (rama `serie`) y `cumplido` pasan `false`, y el
  récord y la celebración siguen. Ojo: la carga manual murió en la Fase 18n, así
  que en la práctica los PR dejan de sumar puntos hasta que exista la pantalla de
  corrección (Nota 23l). Hay que decirlo en el SDD.

## Plan de arreglos (carril A, sin empezar)
Worktree `~/Developer/worktrees/advance_fitness_app--progresion-revision`,
rama `tarea/progresion-revision` desde `fe27d5b` (le falta `dip rails
tailwindcss:build`). Cada arreglo con un spec que falle sin él:
1. Reprogramación: `ReprogramacionDia` rechaza crear si `fecha_original` o
   `fecha_destino` ya tienen entrenamiento del dueño del plan (series o
   ejercicio marcado) y rechaza destruir si el destino ya se entrenó. Cierra el
   lazo de borrar y re-mover.
2. PR sin puntos en la sesión (decisión de arriba).
3. `mas_liviana?`: no es liviana si el peso efectivo supera la base, aunque
   tenga menos reps o series. Specs para los ejes series y reps (hallazgo baja).
4. La fase del ciclo solo aplica si el tenant tiene `feature?("ciclo")`: en
   `prescripcion_de`, ajuste identidad si está apagada. Arregla la sesión y la
   regla a la vez. Verificar cómo se chequea `ciclo` en otros lugares.
5. Re-visita: en los ejercicios con series ya registradas hoy,
   `peso_registro_kg` usa el peso registrado, no el sugerido nuevo.
6. `aplicar_incremento!` solo toca las entradas con `peso_sugerido_kg` > 0.
7. SDD: Nota 27 (h) con todo lo anterior.
El cruce de series del mismo `ejercicio_id` dos veces en un día necesita uid en
`detalles_entrenamiento` (migración): queda como tarea propia, sin declarar.

## Cómo correr la suite en un worktree
El `docker-compose.yml` fija `project_name: advance_fitness_app`, así que todos
los worktrees comparten el contenedor `db` y la base de test. Para correr sin
chocar con otra sesión, cada carril usa su propia base, sin archivo de entorno
(no copiar `.env`: trae `DEV_DATABASE_URL`, que es producción) y con VAPID de
relleno para los specs de push:
`dip compose run --rm -e RAILS_ENV=test -e TEST_DATABASE_URL=postgres://postgres:postgres@db:5432/advance_fitness_app_test_<carril> -e VAPID_PUBLIC_KEY=relleno -e VAPID_PRIVATE_KEY=relleno web bin/rails db:test:prepare`
y después lo mismo con `web bundle exec rspec [rutas]`. Antes, `dip rails
tailwindcss:build` una vez por worktree. Sin probar todavía: la primera corrida
confirma que los 6 de push quedan verdes. Docker estuvo lento (contenedores
varios minutos en "Created").

## Bitácora
- 2026-09-23: revisión corrida; hallazgos arriba. Sin tocar código todavía.
- 2026-09-23 (cierre por contexto >200k): Yonatan decidió mesociclo y PR;
  plan del carril A escrito arriba; worktree creado sin cambios. La siguiente
  sesión arranca en el paso 1. Refutador obligatorio al final: es dinero de
  puntos y ranking.
