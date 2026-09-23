---
estado: hecha
dueño: sesión
fecha: 2026-09-23
tema: Progresion::Regla solo subía el peso en la semana 1 del mesociclo — ahora compara contra la misma prescripción efectiva que registra la sesión
criterio_cierre: specs de recorrido GET /sesion → POST por chip a través de las 4 semanas del mesociclo por defecto, rojos contra el código viejo; SDD Nota 27g; `dip test`, `dip rubocop` y `dip brakeman` en verde; en main
---

En la app (`advance_fitness_app/`). La regla comparaba contra el sugerido de
la BASE mientras la sesión registra el efectivo (semana × fase del ciclo,
Nota 27f): con el mesociclo 1.0/1.05/1.1/0.85 solo progresaba en la semana 1.
Decisión de Yonatan: comparar contra lo efectivo con compuertas (descarga,
fase del ciclo que recorta, día más liviano que la base). Detalle y
consecuencias en SDD Nota 27g.

## Bitácora
- 2026-09-23: `PlanPersonalizado#prescripcion_de` compartido por
  SesionesController y la regla; compuertas y specs (4 rojos contra el código
  viejo, cada compuerta mutada rompe su spec). Commit c1dd50e sobre 1dcb0a6
  (27f), merge 4c4d32f en main y push. Suite del merge: 1020 ejemplos,
  0 fallas (VAPID placeholder); rubocop 407 archivos sin ofensas; brakeman
  0 warnings. Ramas claude/trusting-benz y claude/modest-hugle borradas.
  NO desplegado (Kamal es de Yonatan).
- Queda observado, sin tocar: terminado el mesociclo la sesión se queda en la
  última semana (descarga, 0.85) hasta renovar el plan — la regla no dispara.
