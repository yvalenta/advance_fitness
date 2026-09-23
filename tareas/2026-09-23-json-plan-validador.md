---
estado: propuesta
dueño: ambos
fecha: 2026-09-23
tema: el JSON crudo del plan (modo avanzado del staff) entra sin validar — sin uid ni catálogo cerrado — y la aduana de la IA no sirve tal cual
criterio_cierre: GestionPlanesController#update valida la rutina pegada con specs para los 4 casos del refutador (plan viejo sin uid conserva sus "hecho", v2 con semana basura no pierde semanas, version/semanas_total raros → rechazo limpio y no 500, uid numérico/duplicado) y refutador sin hallazgo
---

Ítem de la tarea `2026-09-23-ideas-gymmane-workout-guide` (§1). En
`advance_fitness_app/`, `GestionPlanesController#update` guarda el JSON tal
cual: un ejercicio pegado sin `uid` no progresa (`Progresion::Regla` busca
por uid) y un `ejercicio_id` inventado pasa. La tentación —y el primer
intento, 23-sep-2026, NO commiteado— es llamar a
`Ejercicios::ValidadorRutina.corregir!` como hace `GenerarPlanJob`. El
refutador lo tumbó con cuatro hallazgos reproducidos:

1. **Alto — planes viejos (pre-14.6) sin uid:** `corregir!` estrena uids y el
   estado del día está guardado por índice (`"i0"`, `"i1"`): `estado_de` pasa
   de `[true,true]` a `[nil,nil]`, el miembro pierde lo marcado y baja la
   adherencia. Basta con que el staff guarde solo la nutrición: el editor
   manda las dos cajas juntas (`planes_personalizados/_editor.html.erb:54-59`).
   La Nota 16 del SDD promete statu quo para esos planes.
2. **Alto — mesociclo del staff pisado:** `ValidadorRutina.sanear_semanas!`
   reemplaza 6 semanas hechas a mano por las
   4 de fábrica si el arreglo trae un `null`; `semanas_total` queda en 6.
   `"semanas": null` sobre un v1 lo vuelve mesociclo de 4 semanas (el
   validador lo ve v2, `rutina_normalizada` —`plan_personalizado.rb:379`— lo
   lee v1). Y el controller descarta `correcciones`: dice "Plan actualizado."
3. **Medio — 500 que siguen:** `{"dias":[],"version":true}` (o `{}`/`[]`) →
   `NoMethodError` en `ValidadorRutina.v2?` (`.to_i` sobre `version`);
   `semanas_total: 1e400` → `FloatDomainError` en `sanear_datos_mesociclo!`. Hoy ese JSON se
   guarda y rompe la VISTA del plan (`plan_personalizado.rb:380`).
4. **Medio — uid no estable:** uid numérico (`7`) se conserva y la regla lo
   compara contra el string del request → nunca progresa; uid repetido entre
   dos días de la misma semana → la regla siempre encuentra el primero
   (`progresion/regla.rb:66,80`). Ojo: entre semanas materializadas el uid se
   repite A PROPÓSITO (mismas copias de la base).

**Decisiones antes de codificar (SDD primero):** política de uid para planes
sin uid (¿no estrenar si el plan anterior no los usaba?); para el staff,
¿el mesociclo inválido se RECHAZA con mensaje o se corrige y se avisa con el
conteo? (la aduana de la IA corrige en silencio porque la IA no lee avisos; el
staff sí). Rechazar lo no-Hash en la raíz es seguro (el intento lo tenía con
spec). Previo y aparte: el autosave del editor inline
(`plan_personalizado.rb:430`) acepta cualquier `ejercicio_id` sin catálogo.

## Bitácora
- 2026-09-23: intento con `corregir!` + guard de ejercicio no-Hash + rechazo
  de raíz no-objeto (specs con dientes: fallaban sin el fix); refutador con
  los 4 hallazgos de arriba → revertido antes del commit, nada en `main`.
