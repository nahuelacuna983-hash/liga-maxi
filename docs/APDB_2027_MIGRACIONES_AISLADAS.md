# APdB 2027 — Orden de consolidación aislada

## Orden propuesto

| Orden | Fuente | Dependencias | Estado |
|---:|---|---|---|
| 10 | `ejecutar-en-supabase-permisos-base.sql` | tablas base y `auth.uid()` | fuente disponible, no consolidada |
| 20 | `ejecutar-en-supabase-permisos-seed-apdb.sql` | permisos base, equipos/categorías reales | seed sintético pendiente |
| 30 | `ejecutar-en-supabase-documentacion.sql` | torneos, categorías, equipos | fuente disponible, revisar duplicados |
| 40 | `ejecutar-en-supabase-documentacion-jugadores.sql` | documentación y planteles | fuente disponible, revisar grants |
| 50 | `ejecutar-en-supabase-documentacion-subidas.sql` | `storage.buckets`, `storage.objects` | requiere Storage Supabase |
| 60 | `ejecutar-en-supabase-playoffs.sql` | categorías y partidos | fuente disponible, políticas legacy |
| 70 | `ejecutar-en-supabase-programacion.sql` | partidos y categorías | fuente disponible, políticas legacy |

## Definiciones faltantes

- Esquema completo de tablas base de torneos, organizaciones, equipos,
  jugadores y partidos.
- Configuración local de Supabase Auth y relación verificable con `auth.users`.
- Esquema/servicio real de Storage y su modelo de objetos.
- Cuerpos definitivos y permisos mínimos de RPC administrativas.
- Políticas de organización, categoría y equipo para delegados.
- Seeds sintéticos compatibles con las claves foráneas reales.

Estas ausencias impiden producir migraciones ejecutables fieles. Las tablas
reducidas de `docs/apdb-2027-rls-fixture.sql` sirven para el gate catalogal,
pero no pueden reutilizarse como sustituto del esquema Supabase.

## Datos sintéticos requeridos

El seed aislado deberá crear dos organizaciones, un torneo por organización,
categorías/equipos separados, una Asociación, delegados autorizado/ajeno/
revocado, jugadores sintéticos y archivos de prueba no médicos. Las identidades
deben crearse por Auth del entorno aislado, no insertando manualmente una fila
en una tabla de aplicación.

## Criterio para convertir fuentes en migraciones

Cada archivo debe ejecutarse en una base Supabase vacía, registrar sus objetos
creados y pasar rollback/restore. Luego se agregan pruebas HTTP con JWT reales
para resultados, programación, playoffs, documentación y Storage. Hasta entonces
este directorio no debe contener una cadena de migraciones que parezca lista.
