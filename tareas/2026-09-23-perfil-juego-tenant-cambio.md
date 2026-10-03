---
estado: bloqueada
dueño: ambos
fecha: 2026-09-23
tema: tras cambiar de gimnasio, el PerfilJuego queda con el tenant viejo y todo perfil.update! revienta (racha, puntos, recordatorio)
criterio_cierre: spec que estaciona a un miembro en otro gimnasio y luego registra una sesión y corre RecordatorioRachaJob sin RecordInvalid; decisión de a qué gimnasio pertenecen los puntos escrita en el SDD
---

Hallado el 23-sep-2026 escribiendo el spec de `RecordatorioRachaJob` (tarea
`2026-09-23-ideas-gymmane-workout-guide`), en `advance_fitness_app/`:

- `PerfilJuego` es UNO por usuario (`validates :user_id, uniqueness`) con
  `tenant_id` desnormalizado vía `hereda_tenant_de :user`
  (`app/models/concerns/tenant_desnormalizado.rb:32`): valida
  `tenant_id == user.tenant_id`.
- `User#estacionar_en!` (`app/models/user.rb:130`), el embudo del cambio de
  organización, reescribe `users.tenant_id` y NO toca `perfiles_juego`.
- Resultado: después de un cambio de gimnasio, cada `perfil.update!` levanta
  `RecordInvalid` ("Tenant debe coincidir con el de user"):
  `Juego::Racha` (`app/services/juego/racha.rb:10`), `Juego::Otorgador:41`,
  `Juego::Recalculador:13` y `RecordatorioRachaJob`. En el job es peor:
  el `find_each` se corta en ese perfil y **nadie** de los que venían
  detrás recibe el aviso ese día.
- Reproducción mínima: el spec del job con `users(:two).update_columns(tenant_id: megaplex)`
  DESPUÉS de crear su perfil (el orden inverso es el que quedó commiteado).

**Decisión antes de codificar (SDD primero):** ¿los puntos, la racha y los
logros son de la persona (el perfil sigue a la cuenta: re-sincronizar
`tenant_id` en `estacionar_en!` y el ranking del gimnasio A la pierde) o de
cada gimnasio (un perfil por puesto: índice único `[user_id, tenant_id]` y
migración)? Hoy nadie lo decidió. Medir primero en producción, en solo
lectura, cuántos perfiles ya están desfasados:
`SELECT count(*) FROM perfiles_juego p JOIN users u ON u.id = p.user_id WHERE p.tenant_id IS DISTINCT FROM u.tenant_id;`

## Bitácora
- 2026-09-23: hallado y reproducido en spec local; sin tocar código.
- 2026-09-23: Yonatan decidió que el juego es **de la persona**: el perfil sigue a la
  cuenta (`estacionar_en!` re-sincroniza `tenant_id`), con privacidad fail-closed
  del ranking y el muro en el gimnasio nuevo. Se hace como Paso 1 de
  `2026-09-23-logros-otorgados` (misma rama `tarea/logros`), porque los logros
  dependen de esto. Diseño en esa tarea.
- 2026-10-03: hecho en la app, rama `tarea/perfil-juego` (worktree `~/Developer/worktrees/advance_fitness_app--perfil-juego`, sobre `main` 664ec64), commit `ac11f0a`. `User` gana un `after_save` sobre `saved_change_to_tenant_id?` (`app/models/user.rb:92`, método `:237`) que llama `PerfilJuego#seguir_a_la_cuenta!` (`app/models/perfil_juego.rb:31`) en la misma transacción; privacidad fail-closed: `visible_en_tabla=false` y `Consentimiento.revocar_al_cambiar_de_gimnasio!` (`app/models/consentimiento.rb:42`) revoca `tabla_posiciones` y `logros_comunidad` con rastro (`cambio-de-gimnasio`); migración de datos `db/migrate/20261003000000_resincronizar_tenant_de_perfiles_juego.rb` (JOIN, idempotente, `down` no-op). Decisión de a qué gimnasio pertenecen los puntos: Nota 29 (+ fila 21) en `advance-fitness-sdd.md` de la app (la 28 es de `tarea/bump-gemas`). Prueba negativa: ANTES del arreglo 11 specs nuevos rojos (p. ej. `user_spec.rb:67`: `expected no Exception, got #<ActiveRecord::RecordInvalid: La validación falló: Tenant debe coincidir con el de user>`; el POST del ranking en el gimnasio nuevo daba `422`; el job: `RecordInvalid` y los demás sin aviso) y 3 de la migración con `up` vacío. Después: `rspec` completo `1046 examples, 0 failures`; `rubocop` `411 files inspected, no offenses detected`; `brakeman` `Security Warnings: 0` (con `bundle exec brakeman`: `bin/brakeman` da exit 5 en main por `--ensure-latest`, 8.0.6 vs 8.1.0, lo arregla `tarea/bump-gemas`). Base de test propia `advance_fitness_app_test_perfil`; nada contra producción ni Supabase.
- 2026-10-03: HALLAZGO hermano, fuera de alcance, reproducido en spec descartable: `membresias`, `pagos`, `suscripciones` y `posts` también desnormalizan tenant (`hereda_tenant_de`) y tras `estacionar_en!` un `membresia.update!(estado: "vencida")` levanta `RecordInvalid` ("Tenant debe coincidir"): `VencerMembresiasJob` (`app/jobs/vencer_membresias_job.rb:8`) se corta igual que el de racha para quien se mudó con membresía vigente. Es el modelo de dinero multi-gimnasio (documentado en `tenant_desnormalizado.rb`): decisión aparte, tarea propia. HUECO del muro anotado en la Nota 29(c): `Comunidad::Muro` enumera por puesto con consentimiento global.
- 2026-10-03: pendiente — refutación adversarial (tenencia/privacidad) antes del merge, y de Yonatan: merge/integración a main (regla de historia lineal), deploy y correr la migración de datos en producción (aparca). No medí producción. desbloquea: Yonatan.
- 2026-10-03: refutación ronda 1 REPARADA en la app, rama `tarea/perfil-juego`, commit nuevo `8a5cd13` (sobre `ac11f0a`, sin amend; sin push ni merge). H1 (medio) `db/migrate/20261003000000_resincronizar_tenant_de_perfiles_juego.rb:33-92`: la revocación parte de `cambios_organizacion` (fila con pase, de un tenant a otro; `MUDANZAS`), no del perfil desfasado — cubre cuentas sin perfil o con perfil nacido en el gimnasio nuevo; y quien volvió al gimnasio de su perfil (A→B→A) sale de la tabla (flag a false, `:86`). H3 (bajo) mismo archivo `:63-70`: solo se revoca el opt-in dado antes o en la fecha de la última mudanza; uno posterior es legítimo del gimnasio nuevo y no se toca; sin fila de mudanza queda la regla vieja, fail-closed. H2 (medio) `app/models/perfil_juego.rb:14,64-69`: validación al CREAR contra el tenant fresco de la fila (`SELECT … FOR SHARE` dentro de la transacción del INSERT, verificado con el log SQL: SAVEPOINT → SELECT … FOR SHARE → INSERT → RELEASE) y se NIEGA con `RecordInvalid` si la cuenta cargada ya es vieja (elegí fail-closed, igual que el `update!` de un perfil existente; no auto-repara, porque reparar en silencio dejaría a `participar` abrir el opt-in en el gimnasio nuevo desde una pantalla del viejo); agravante `perfil_juego.rb:39`: `seguir_a_la_cuenta!` sin early-return, apaga `visible_en_tabla` en toda mudanza. Los repros de `spec/refutacion` se promovieron a `spec/db/resincronizar_tenant_de_perfiles_juego_spec.rb` (H1, H3, perfil sin fila), `spec/models/perfil_juego_spec.rb:48` (H2 + control de la carrera con perfil existente) y `spec/models/user_spec.rb:142` (agravante); `spec/refutacion` borrado. Cinta. ANTES del arreglo (`rspec spec/db/resincronizar_tenant_de_perfiles_juego_spec.rb spec/models/perfil_juego_spec.rb spec/models/user_spec.rb`): `48 examples, 7 failures` (p. ej. `expected false got true` en `vigente?(quieto, "logros_comunidad")`; `expected nothing was raised` en `PerfilJuego.para(cargada)`; `perfil.reload.visible_en_tabla expected false got true`). DESPUÉS, mismos tres archivos: `48 examples, 0 failures`. `dip test`: `1060 examples, 0 failures`; `dip rubocop`: `411 files inspected, no offenses detected`; `bundle exec brakeman -q --no-pager`: `Security Warnings: 0`. SDD: Nota 29 (d) reescrita y (f) nueva en `advance-fitness-sdd.md` de la app. RESIDUAL anotado, NO arreglado (ventana de deploy): `bin/docker-entrypoint` corre `db:prepare` con el contenedor viejo aún sirviendo (drain 130 s, código sin callback): un pase canjeado ahí deja un perfil desfasado que la migración ya corrida no ve; es idempotente y sale de `cambios_organizacion`, se puede re-correr tras el drain (`bin/rails db:migrate:redo VERSION=20261003000000`) — operación de Yonatan. Es TENENCIA/privacidad: vuelve a refutación del diff `ac11f0a..8a5cd13` antes del merge. Sigue `bloqueada`. desbloquea: Yonatan (refutación ronda 2, merge/integración a main, deploy, correr la migración en producción y la re-corrida tras el drain). Nada medido contra producción.
