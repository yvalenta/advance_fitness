---
estado: en-curso
dueño: yonatan
fecha: 2026-09-23
tema: la racha cortada se seguía mostrando encendida en el dashboard y el ranking
criterio_cierre: rama racha-vigente mergeada a main y desplegada; un miembro que no entrena hace ≥2 días ve "0 días" apagado (specs de dashboard y ranking en verde)
---

`perfiles_juego.racha_actual` solo cambia con actividad nueva
(`Juego::Racha.actualizar!`), así que `shared/_racha.html.erb` y
`tabla_posiciones/_fila.html.erb` pintaban la racha vieja encendida a quien
dejó de ir. Arreglo: `PerfilJuego#racha_vigente(hoy)` — viva solo si
`ultima_fecha_racha` es hoy o ayer, con cota superior. La columna no cambia.

Lo que falta es solo el merge a `main` y el deploy (Yonatan). El problema de
fondo de las fechas futuras queda en `2026-09-23-racha-fechas-futuras`.

## Bitácora
- 2026-09-23: commit `15b2077` en `racha-vigente`, pusheado a origin (sin
  merge). `dip test` 1013 examples, 0 failures; rubocop 407 archivos sin
  ofensas; brakeman 0 warnings (corrido sin `--ensure-latest`, que aborta con
  exit 5 antes de escanear). Prueba negativa: sin el arreglo fallan 5
  ejemplos, incluidos los de dashboard y ranking. El refutador de la casa
  encontró que faltaba la cota superior (fecha futura = racha encendida); se
  corrigió antes del commit.
