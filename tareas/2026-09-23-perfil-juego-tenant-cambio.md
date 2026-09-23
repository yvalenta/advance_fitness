---
estado: propuesta
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
