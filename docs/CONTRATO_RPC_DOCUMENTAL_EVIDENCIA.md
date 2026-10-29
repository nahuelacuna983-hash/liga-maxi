# Evidencia de pruebas del contrato documental

## Alcance

Se preparó un entorno PostgreSQL 16 aislado y un workflow manual independiente de `RLS local integration`. No se ejecutó todavía GitHub Actions desde este cambio y no se conectó a Supabase real.

## Qué reproduce el arnés

- Las ocho firmas históricas.
- Tablas mínimas de jugadores, documentos, documentos institucionales, equipos, permisos y eventos.
- Roles anónimo, delegado de equipo A, delegado de equipo B y Asociación.
- Operaciones de alta, subida, revisión, revisión institucional, revisión desde Drive, alta desde Drive y bajas.
- Identidad derivada de `auth.uid()` y alcance por torneo/categoría/equipo.
- Rechazo de cruce de equipo, anónimo y operación no autorizada.
- Comprobación de que la revisión de Asociación registra el actor de sesión, no el actor enviado.
- Consulta de `prosecdef`, `search_path`, owner y ACL del arnés.

## Qué no reproduce fielmente

- Las definiciones históricas sin corregir de producción: el arnés implementa el contrato propuesto para probarlo de forma segura.
- Esquema completo, triggers, Storage real, buckets, RLS real y tablas auxiliares.
- Login legacy, JWT real, relaciones exactas entre `delegados` y `app_users`, y todos los estados/documentos.
- Compatibilidad funcional de la aplicación contra estas RPC.

Por eso un resultado `DOCUMENT_RPC_LOCAL_TEST_OK` demostraría que el contrato sintético es coherente, no que las ocho RPC actuales de producción ya sean seguras.

## Ejecución

Workflow manual: `.github/workflows/document-rpc-local.yml`.  
Comando local equivalente, con PostgreSQL 16 en `127.0.0.1:5432`:

```powershell
$env:PGHOST='127.0.0.1'; $env:PGPORT='5432'; $env:PGUSER='postgres'; $env:PGPASSWORD='postgres'; $env:PGDATABASE='liga_maxi_document_test'
psql -v ON_ERROR_STOP=1 -f tools/document-rpc-local-test.sql
```

## Decisión sobre PR #2

Los riesgos documentales pueden administrarse en un Issue/PR separado de la migración de partidos, siempre que el PR #2 no dependa de estas RPC para su autorización y que se mantenga documentado que la superficie documental legacy sigue pendiente. La separación no permite declarar segura la aplicación completa: exige un bloqueo de alcance o una aprobación explícita de riesgo.
