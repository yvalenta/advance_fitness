---
estado: hecha
dueño: sesión
fecha: 2026-09-30
tema: re-sincronizar el standby frío del homelab al sha de producción 9d1cc8e (hoy sigue en b2cc9f8, con sondeo a 0,1 s)
criterio_cierre: en el homelab, advance_fitness_app-web-9d1cc8e… en Created y 0 contenedores advance_fitness corriendo; las 13 claves del script iguales a producción por hash; DEPLOY.md con el comando de failover y la «última sincronización» en 9d1cc8e; producción responde 200
---

Producción pasó a `9d1cc8e` el 2026-09-30 (tarea `egress-supabase-sondeo`).
El standby del homelab sigue en `b2cc9f8`: si se promueve, vuelve el sondeo
de Solid Queue a 0,1 s y con él el egress de Supabase. Yonatan pidió
re-sincronizarlo. El procedimiento es DEPLOY.md §4 del repo de la app. Ya
se verificó que `config/deploy.yml`, `.kamal/` y `Dockerfile` no cambiaron
entre `b2cc9f8` y `9d1cc8e`, así que clonar el entorno del standby viejo da
las mismas variables.

Pasos que faltan, en orden:

1. **Imagen en el homelab.** Verificar con
   `ssh ynt@homelab.casa 'docker image inspect localhost:5555/advance_fitness_app:9d1cc8e67d0ad1b74598c17253ef0371d1590bdb --format "{{.Id}}"'`.
   En Lightsail el id es `sha256:2520e7f8…`. Si no está, repetir el paso 1
   de DEPLOY.md §4 (save | gzip → gunzip | load, ~1 GB por la WiFi de
   2,4 GHz).
2. **Script.** `/tmp/sincronizar_standby.sh` quedó copiado con sha256
   `a2db5b92…`, igual a `ops/sincronizar_standby.sh`. Si `/tmp` se limpió,
   volver a copiarlo con `scp`.
3. **Crear el contenedor detenido:**
   `ssh ynt@homelab.casa "/tmp/sincronizar_standby.sh advance_fitness_app-web-b2cc9f87918b8fd18b0be451285355aa16ad6132 9d1cc8e67d0ad1b74598c17253ef0371d1590bdb"`.
4. **Las tres verificaciones de DEPLOY.md §4:**
   - 0 contenedores corriendo;
   - el nuevo en Created;
   - producción en 200.

   Además, comparar por hash, sin imprimir valores, las claves del nuevo
   standby contra el contenedor de producción. El `.env` de la Mac pudo
   cambiar desde el 23-sep, y en ese caso el clon del viejo traería valores
   viejos.
5. **DEPLOY.md:**
   - comando de failover y «última sincronización» → `9d1cc8e`;
   - anotar que `b2cc9f8` (contenedor e imagen) sigue en el homelab, detenido.

   Borrarlo es decisión de Yonatan (lista 2).

## Bitácora
- 2026-09-30: estado medido en el homelab: el standby `b2cc9f8` y
  `cloudflared-main` están en Created; hay 0 contenedores advance corriendo
  y 367 GB libres. El script se copió a `/tmp` y su checksum coincide con
  el del repo. La transferencia de la imagen arrancó a las 02:50:40 UTC
  como proceso en segundo plano de la sesión que corrió el deploy; esa
  sesión se cortó por la regla de los 200k antes de ver si terminó. Pasos
  3–5 sin hacer.
- 2026-10-01: la transferencia terminó a las 03:34:28 UTC (empezó 02:50:40):
  `Loaded image: localhost:5555/advance_fitness_app:9d1cc8e67d0ad1b74598c17253ef0371d1590bdb`,
  exit 0. Paso 1 hecho; confirmar el id `sha256:2520e7f8…` en el homelab y
  seguir desde el paso 2.
- 2026-10-01 (sesión fría, 03:00–03:45 UTC): en el homelab, el id de la
  imagen es `sha256:2520e7f81b54…`, el mismo que en Lightsail. Lightsail usa
  el almacén containerd, así que el stream fueron ~270 MB de capas ya
  comprimidas (gzip -1 a razón 1,00), a 60–140 KB/s. Las 13 claves del
  script en el standby `b2cc9f8` son iguales a las de producción `9d1cc8e`
  por hash, y no sobra ni falta ninguna en ningún lado. El script sigue con
  sha256 `a2db5b92…` y hay 0 contenedores advance corriendo. **El paso 3 lo
  negó el clasificador de permisos de Claude Code («Production Deploy»).**
  Lo desbloquea Yonatan, corriéndolo él o dando el permiso; los pasos 4–5
  esperan a ese. Quedó DEPLOY.md §4 corregido, sin commit, en el worktree
  `~/Developer/worktrees/advance_fitness_app--standby-homelab-9d1cc8e`
  (rama `tarea/standby-homelab-9d1cc8e`): el tamaño medido y una cuarta
  verificación, el diff del env por hash contra producción. Se probó contra
  `b2cc9f8`: solo difieren `KAMAL_CONTAINER_NAME` y `KAMAL_VERSION`.
- 2026-10-01 (~03:50 UTC): Yonatan dio el GO al paso 3. El clasificador lo
  volvió a negar aun con el GO, así que Yonatan corrió el script él mismo
  con `!` desde la sesión: «creando advance_fitness_app-web-9d1cc8e…
  (DETENIDO) con 13 variables», en Created. Las cuatro verificaciones:
  0 contenedores advance corriendo; `9d1cc8e`, `b2cc9f8` y
  `cloudflared-main` en Created, con las mismas redes y alias
  (`docker-lab_proxy-network` y `kamal` con `rails-app`), `unless-stopped`
  y volumen que el viejo; producción `/up` en 200 (la raíz da 302 a
  `/session/new`, que da 200); el env del nuevo es idéntico al de
  producción por hash en 27 claves (todas salvo `KAMAL_HOST`). DEPLOY.md
  quedó en main como `f71676f` (rebase + fast-forward sobre `9d1cc8e`, con
  los avisos de bypass de siempre): el failover y la «última
  sincronización» en `9d1cc8e`, `b2cc9f8` anotado como respaldo detenido
  y el runbook §4 con las cuatro verificaciones. Worktree desmontado.
  Borrar `b2cc9f8` (contenedor e imagen) queda como decisión de Yonatan.
