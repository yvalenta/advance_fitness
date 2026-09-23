---
estado: propuesta
dueño: ambos
fecha: 2026-09-23
tema: el servidor acepta marcar actividad con fecha futura y eso congela o colapsa la racha (y la reprogramación lleva ahí en el flujo normal)
criterio_cierre: specs que reproducen los escenarios A, B y D de abajo pasan con la racha correcta; ninguna marca de actividad escribe una fecha > hoy en registros_puntos/perfiles_juego
---

Hallazgo del refutador al revisar `racha-vigente` (2026-09-23). Previo a ese
cambio; lectura + specs de reproducción del agente (no están en el repo).

**Entrada:** `RegistrosEntrenamientoController#fecha_param` acepta cualquier
fecha ISO y la manda a `OtorgarPuntosJob`; `/sesion/AAAA-MM-DD` sirve la
sesión de cualquier fecha con "Marcar día como hecho" (`sesion_controller.js`
postea `this.datos.fecha`). Solo la vista del plan deshabilita el futuro
(`_dia_editor.html.erb`); el servidor no lo exige.

**Efecto:** `Juego::Racha` es no-op para toda fecha ≤ la última, así que una
fecha futura congela la racha; el `Recalculador` nocturno la conserva
(`fechas.last`).
- A: racha 5 al día; marca hoy+14 → racha 1, `ultima_fecha_racha` = hoy+14;
  marcar mañana no hace nada.
- B: marcar hoy…hoy+29 escribiendo la URL → racha 30 y 450 puntos, que suben
  en el ranking (desde `15b2077` la racha ya no se muestra, pero los puntos sí).
- D (flujo normal): reprogramar hoy→viernes (`sesiones/show.html.erb:90`,
  destino ≥ hoy) y entrar por "Ir a esa fecha" (`_movido.html.erb:14`) para
  entrenar en ese momento. La actividad queda con fecha del viernes: la
  racha del miércoles da 1 en vez de 6, la tira L–D pinta el viernes cumplido
  y hoy vacío (`dashboard_controller.rb:31-33` sin tope; en `_racha.html.erb`
  "cumplido" le gana a "futuro").
- Aparte, desmarcar un ejercicio no revierte los puntos ni la racha
  (`registros_entrenamiento_controller.rb:17,27-30`), pero la tira sí se vacía.

**Decisión de diseño a tomar:** ¿la actividad cuenta en la fecha en que se
hizo (hoy) aunque el contenido sea de otra fecha (reprogramación, Nota 26e), o
se rechaza marcar el futuro? Probable: la racha y el ledger usan
`[fecha, Date.current].min` y el controller rechaza fechas > hoy salvo el
destino de una reprogramación. Antes de tocar datos, Yonatan puede medir en
producción (solo lectura):
`SELECT count(*) FROM perfiles_juego WHERE ultima_fecha_racha > (now() AT TIME ZONE 'America/Bogota')::date;`
(lo mismo sobre `registros_entrenamiento.fecha` y `registros_puntos.fecha`).

## Bitácora
- 2026-09-23: hallazgo documentado; sin código.
