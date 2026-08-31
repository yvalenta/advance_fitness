# Advance Fitness en la constelación

Declaración de este repo para el grafo de proyectos de la casa (lo lee
el observatorio interno de la casa, que documenta el formato). Repo público:
solo superficies públicas, máquinas por nombre genérico.

| campo | valor |
|---|---|
| id | advance_fitness |
| clase | producto |
| qué | gestión de gimnasios multi-tenant en Rails 8 (membresías, pagos, check-ins, entrenamiento, nutrición, planes con IA) + landing pública de conversión |
| dónde | mac `~/Developer/advance_fitness` (edición; la app Rails vive anidada en `advance_fitness_app/`, repo git propio) · producción: landing en Netlify, app desplegada con Kamal detrás de Cloudflare |
| servicio | `—` (contenedor Docker gestionado por Kamal; deploy a demanda desde la Mac) |
| atiende | Yonatan (deploy con Kamal); sesiones de Claude a demanda; pregonero lo mira desde `#fitness` |
| contexto | `advance_fitness_app/README.md` (documento rector: `advance_fitness_app/advance-fitness-sdd.md`) |
| visibilidad | público: `github:yvalenta/advance_fitness` (landing) · `github:yvalenta/advance_fitness_app` (app) |

## Aristas

| a | b | tipo | por | medición |
|---|---|---|---|---|
| advance_fitness | netlify | publica | landing → `https://advance-fitness.ynt.codes` | `http https://advance-fitness.ynt.codes 200` |
| advance_fitness | cloudflare | publica | app Rails multi-tenant → `https://advance-fitness-app.ynt.codes` (302 al login) y subdominios `{slug}.ynt.codes` por tenant | `http https://advance-fitness-app.ynt.codes 302` |
| advance_fitness | supabase | consume | Postgres de producción (`DATABASE_URL` al pooler en modo sesión; también cache/queue/cable vía Solid sobre la misma base) | `—` |
| advance_fitness | gemini | consume | generación de planes personalizados con IA (`app/services/ia/`, `GenerarPlanJob`) | `—` |
| advance_fitness | google | consume | login OAuth (`omniauth-google-oauth2`) | `—` |
| mac | advance_fitness | atiende | deploy a demanda con Kamal (`advance_fitness_app/config/deploy.yml`, build remoto desde la Mac) | `—` |
