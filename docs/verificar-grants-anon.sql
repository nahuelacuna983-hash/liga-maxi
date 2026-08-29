-- Verificacion de grants concedidos a anon/authenticated.
-- Solo lectura: no modifica tablas, funciones ni datos.

select
  routine_schema as schema,
  routine_name as funcion,
  privilege_type,
  grantee
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by routine_name, grantee, privilege_type;

select
  table_schema as schema,
  table_name as tabla_o_vista,
  privilege_type,
  grantee
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;

-- Lectura:
-- 1. Las tablas publicas de consulta pueden tener SELECT para anon si no exponen datos sensibles.
-- 2. Vistas admin, documentos, permisos y auditoria no deberian quedar abiertos a anon en la version final.
-- 3. Funciones de escritura/revision no deberian quedar con EXECUTE para anon en la version final.
