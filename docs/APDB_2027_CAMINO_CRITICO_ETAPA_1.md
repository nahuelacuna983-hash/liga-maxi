# APdB 2027 — Camino crítico, etapa 1

## Trabajo completado

- Se versionó el inventario de fuentes SQL necesarias para permisos, usuarios,
  documentación, Storage, playoffs y programación.
- Se agregó `tests/apdb-supabase-source-manifest.cjs`, que verifica que todas
  las fuentes existan, tengan contenido y no incluyan URLs/secrets productivos.
- Se agregó `tools/prepare-apdb-supabase-isolated.ps1`. Es un preparador
  bloqueante: comprueba Supabase CLI, Docker, psql y fuentes antes de permitir
  cualquier inicio. No ejecuta migraciones ni crea servicios en modo
  `-CheckOnly`.

## Dependencia imprescindible

Esta rama no contiene todavía `supabase/config.toml` ni migraciones ordenadas
para reconstruir Auth, Storage y todas las RPC productivas. Las definiciones
existentes están distribuidas en scripts `docs/ejecutar-en-supabase-*.sql`, con
dependencias y políticas legacy que deben revisarse antes de consolidarlas.
Además, el entorno actual no tiene Supabase CLI, Docker ni psql.

Por estas dos razones no se declara preparada una instancia Supabase aislada:
hacer `supabase start` con una consolidación parcial produciría una prueba no
representativa.

## Próximo bloque listo

Con un entorno autorizado que disponga de las herramientas, el siguiente bloque
es consolidar las fuentes en migraciones revisables y agregar seeds sintéticos
para dos organizaciones, Asociación, delegados y revocaciones. Después se podrá
levantar Auth/Storage local y ejecutar HTTP con JWT reales.

No se requiere acceso a producción para continuar, pero sí las versiones y
definiciones reales de Auth/Storage/RPC que hoy no están consolidadas en el
checkout.
