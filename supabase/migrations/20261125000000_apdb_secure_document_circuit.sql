-- APdB 2027: authenticated documentary circuit for the original online client.
-- This file is applied only to ephemeral Supabase CI before any release review.
begin;

create or replace function public.apdb_document_scope_allowed(
  p_org uuid, p_tournament uuid, p_category uuid, p_team uuid, p_review boolean
) returns boolean
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.app_users au
    join public.app_user_permissions p on p.user_id = au.id
    where au.auth_user_id = auth.uid() and au.active
      and au.organizacion_id = p_org
      and p.organizacion_id = p_org
      and p.torneo_id = p_tournament and p.categoria_id = p_category
      and (p.equipo_id is null or p.equipo_id = p_team)
      and (
        (p_review and au.role in ('asociacion','admin_general') and p.can_review_documents)
        or (not p_review and au.role = 'delegado' and p.equipo_id = p_team
          and p.can_view and p.can_load_documents)
      )
      and exists (
        select 1 from public.equipos e
        join public.categorias c on c.id = e.categoria_id
        join public.torneos t on t.id = c.torneo_id
        where e.id = p_team and c.id = p_category and t.id = p_tournament
          and t.organizacion_id = p_org and t.temporada = '2027'
      )
  );
$$;
revoke all on function public.apdb_document_scope_allowed(uuid,uuid,uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.apdb_document_scope_allowed(uuid,uuid,uuid,uuid,boolean) to authenticated;

create function public.add_team_player(
  p_organizacion_id uuid,
  p_torneo_id uuid,
  p_categoria_id uuid,
  p_equipo_id uuid,
  p_equipo_nombre text,
  p_nombre text,
  p_dni text,
  p_dorsal text,
  p_created_by text
) returns uuid
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  v_org uuid;
  v_team public.equipos%rowtype;
  v_player_id uuid;
  v_actor public.app_users%rowtype;
begin
  select e.* into v_team
  from public.equipos e join public.categorias c on c.id=e.categoria_id
  join public.torneos t on t.id=c.torneo_id
  where e.id=p_equipo_id and c.id=p_categoria_id and t.id=p_torneo_id
    and t.temporada='2027';
  if not found then
    raise exception using errcode='42501',message='equipo/torneo fuera de 2027';
  end if;
  select t.organizacion_id into v_org from public.torneos t where t.id=p_torneo_id;
  if (p_organizacion_id is not null and p_organizacion_id <> v_org)
     or coalesce(trim(p_nombre),'') = '' or char_length(p_nombre)>150
     or nullif(trim(p_equipo_nombre),'') is null
     or p_equipo_nombre is distinct from v_team.nombre
     or not public.apdb_document_scope_allowed(v_org,p_torneo_id,p_categoria_id,p_equipo_id,false) then
    raise exception using errcode='42501',message='alta de jugador no autorizada';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid() and active;
  perform pg_advisory_xact_lock(hashtextextended(
    p_equipo_id::text||':'||lower(trim(p_nombre))||':'||coalesce(nullif(trim(p_dni),''),'sin-dni'),0
  ));
  if exists (
    select 1 from public.team_players tp
    where tp.categoria_id=p_categoria_id and tp.equipo_id=p_equipo_id and tp.activo
      and (nullif(trim(p_dni),'') is not null and tp.dni=trim(p_dni)
        or lower(trim(tp.nombre))=lower(trim(p_nombre)))
  ) then
    raise exception using errcode='23505',message='jugador ya registrado en equipo';
  end if;
  insert into public.team_players(
    organizacion_id,torneo_id,categoria_id,equipo_id,equipo_nombre,nombre,dni,dorsal,created_by
  ) values(
    v_org,p_torneo_id,p_categoria_id,p_equipo_id,v_team.nombre,trim(p_nombre),
    nullif(trim(p_dni),''),nullif(trim(p_dorsal),''),v_actor.display_name
  ) returning id into v_player_id;
  insert into public.player_documents(
    player_id,requirement_id,organizacion_id,torneo_id,categoria_id,
    equipo_id,equipo_nombre,status
  )
  select v_player_id,r.id,v_org,p_torneo_id,p_categoria_id,
    p_equipo_id,v_team.nombre,'pendiente'
  from public.document_requirements r
  where r.activo and r.scope='player' and r.organizacion_id=v_org
    and r.torneo_id=p_torneo_id and r.categoria_id=p_categoria_id;
  return v_player_id;
end;
$$;
revoke all on function public.add_team_player(uuid,uuid,uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.add_team_player(uuid,uuid,uuid,uuid,text,text,text,text,text) to authenticated;

create function public.mark_player_document_uploaded(
  p_document_id uuid,
  p_uploaded_by text,
  p_storage_path text,
  p_file_name text,
  p_file_type text,
  p_file_size bigint,
  p_vencimiento date default null
) returns boolean
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.player_documents%rowtype;
declare v_actor public.app_users%rowtype;
begin
  select * into v_doc from public.player_documents where id=p_document_id for update;
  if not found or not public.apdb_document_scope_allowed(
    v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,false)
    or p_file_size is null or p_file_size<=0 or p_file_size>10485760
    or p_file_type not in ('application/pdf','image/png','image/jpeg')
    or nullif(trim(p_file_name),'') is null
    or not public.apdb_storage_path_allowed(p_storage_path,'upload')
    or not exists (
      select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=p_storage_path
    )
    or split_part(p_storage_path,'/',6) <> v_doc.player_id::text
    or split_part(p_storage_path,'/',7) <> v_doc.requirement_id::text
  then
    raise exception using errcode='42501',message='archivo no autorizado o inexistente';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid();
  update public.player_documents set
    uploaded_by=v_actor.display_name,storage_path=p_storage_path,
    file_name=trim(p_file_name),file_type=p_file_type,file_size=p_file_size,
    vencimiento=p_vencimiento,status='cargado',observacion=null,
    reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.player_document_events(player_document_id,event_type,actor,detail)
  values(v_doc.id,'cargado',v_actor.display_name,'Documento registrado por delegado');
  return true;
end;
$$;
revoke all on function public.mark_player_document_uploaded(uuid,text,text,text,text,bigint,date) from public,anon,authenticated;
grant execute on function public.mark_player_document_uploaded(uuid,text,text,text,text,bigint,date) to authenticated;

create function public.review_player_document(
  p_document_id uuid,p_status text,p_actor text,p_observacion text default null
) returns boolean
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.player_documents%rowtype;
declare v_actor public.app_users%rowtype;
begin
  select * into v_doc from public.player_documents where id=p_document_id for update;
  if not found or p_status not in ('aprobado','observado','rechazado')
    or (p_status <> 'aprobado' and nullif(trim(p_observacion),'') is null)
    or v_doc.storage_path is null or v_doc.status='pendiente'
    or not public.apdb_document_scope_allowed(
      v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,true)
    or not exists(select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=v_doc.storage_path)
  then
    raise exception using errcode='42501',message='revision documental no autorizada';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid();
  update public.player_documents set
    status=p_status,observacion=nullif(trim(p_observacion),''),
    reviewed_by=v_actor.display_name,reviewed_at=clock_timestamp(),
    updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.player_document_events(player_document_id,event_type,actor,detail)
  values(v_doc.id,p_status,v_actor.display_name,coalesce(nullif(trim(p_observacion),''),'Aprobado por Asociación'));
  return true;
end;
$$;
revoke all on function public.review_player_document(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_player_document(uuid,text,text,text) to authenticated;

create function public.mark_team_document_uploaded(
  p_document_id uuid,p_uploaded_by text,p_storage_path text,
  p_file_name text,p_file_type text,p_file_size bigint,p_vencimiento date default null
) returns boolean
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.team_documents%rowtype;
declare v_actor public.app_users%rowtype;
begin
  select * into v_doc from public.team_documents where id=p_document_id for update;
  if not found or not public.apdb_document_scope_allowed(
    v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,false)
    or p_file_size is null or p_file_size<=0 or p_file_size>10485760
    or p_file_type not in ('application/pdf','image/png','image/jpeg')
    or nullif(trim(p_file_name),'') is null
    or not public.apdb_storage_path_allowed(p_storage_path,'upload')
    or not exists(select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=p_storage_path)
    or split_part(p_storage_path,'/',5)<>v_doc.requirement_id::text
  then
    raise exception using errcode='42501',message='archivo de equipo no autorizado';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid();
  update public.team_documents set
    uploaded_by=v_actor.display_name,storage_path=p_storage_path,
    file_name=trim(p_file_name),file_type=p_file_type,file_size=p_file_size,
    vencimiento=p_vencimiento,status='cargado',observacion=null,
    reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.document_events(team_document_id,event_type,actor,detail)
  values(v_doc.id,'cargado',v_actor.display_name,'Documento de equipo cargado');
  return true;
end;
$$;
revoke all on function public.mark_team_document_uploaded(uuid,text,text,text,text,bigint,date) from public,anon,authenticated;
grant execute on function public.mark_team_document_uploaded(uuid,text,text,text,text,bigint,date) to authenticated;

create function public.review_team_document(
  p_document_id uuid,p_status text,p_actor text,p_observacion text default null
) returns boolean
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.team_documents%rowtype;
declare v_actor public.app_users%rowtype;
begin
  select * into v_doc from public.team_documents where id=p_document_id for update;
  if not found or p_status not in ('aprobado','observado','rechazado')
    or (p_status<>'aprobado' and nullif(trim(p_observacion),'') is null)
    or v_doc.storage_path is null or v_doc.status='pendiente'
    or not public.apdb_document_scope_allowed(
      v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,true)
    or not exists(select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=v_doc.storage_path)
  then
    raise exception using errcode='42501',message='revision de equipo no autorizada';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid();
  update public.team_documents set
    status=p_status,observacion=nullif(trim(p_observacion),''),
    reviewed_by=v_actor.display_name,reviewed_at=clock_timestamp(),updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.document_events(team_document_id,event_type,actor,detail)
  values(v_doc.id,p_status,v_actor.display_name,coalesce(nullif(trim(p_observacion),''),'Aprobado por Asociación'));
  return true;
end;
$$;
revoke all on function public.review_team_document(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_team_document(uuid,text,text,text) to authenticated;


-- Read-only views used by the official application must not reveal another
-- organization or another delegated team. A role title alone is insufficient.
create or replace function public.apdb_document_view_allowed(
  p_org uuid,p_tournament uuid,p_category uuid,p_team uuid
) returns boolean
language sql stable security definer
set search_path=public,auth,pg_temp
as $$
  select exists (
    select 1 from public.app_users au
    join public.app_user_permissions p on p.user_id=au.id
    join public.equipos e on e.id=p_team and e.categoria_id=p_category
    join public.categorias c on c.id=e.categoria_id and c.torneo_id=p_tournament
    join public.torneos t on t.id=c.torneo_id and t.organizacion_id=p_org
    where au.auth_user_id=auth.uid() and au.active
      and au.organizacion_id=p_org and p.organizacion_id=p_org
      and p.torneo_id=p_tournament and p.categoria_id=p_category
      and (p.equipo_id is null or p.equipo_id=p_team)
      and (
        (au.role in ('asociacion','admin_general') and p.can_review_documents)
        or (au.role='delegado' and p.equipo_id=p_team
            and p.can_view and p.can_load_documents)
      )
  );
$$;
revoke all on function public.apdb_document_view_allowed(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.apdb_document_view_allowed(uuid,uuid,uuid,uuid) to authenticated;

-- Team view already invokes apdb_document_access_allowed; tighten that helper
-- without altering its result-column contract.
create or replace function public.apdb_document_access_allowed(
  p_organizacion_id uuid,p_categoria_id uuid,p_equipo_id uuid
) returns boolean
language sql stable security definer
set search_path=public,auth,pg_temp
as $$
  select exists (
    select 1 from public.categorias c
    join public.torneos t on t.id=c.torneo_id and t.organizacion_id=p_organizacion_id
    where c.id=p_categoria_id
      and public.apdb_document_view_allowed(p_organizacion_id,t.id,c.id,p_equipo_id)
  );
$$;
revoke all on function public.apdb_document_access_allowed(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.apdb_document_access_allowed(uuid,uuid,uuid) to authenticated;

create or replace view public.v_player_documents_admin
with (security_barrier=true)
as
select pd.id,pd.player_id,
  tp.nombre as jugador_nombre,tp.dni as jugador_dni,tp.dorsal as jugador_dorsal,
  tp.baja_solicitada,tp.baja_motivo,tp.baja_solicitada_por,tp.baja_solicitada_en,
  pd.requirement_id,dr.nombre as requirement_nombre,
  pd.organizacion_id,o.nombre as organizacion_nombre,
  pd.torneo_id,t.nombre as torneo_nombre,
  pd.categoria_id,c.nombre as categoria_nombre,
  pd.equipo_id,pd.equipo_nombre,pd.uploaded_by,pd.storage_path,
  pd.file_name,pd.file_type,pd.file_size,pd.status,pd.vencimiento,
  pd.observacion,pd.reviewed_by,pd.reviewed_at,pd.created_at,pd.updated_at
from public.player_documents pd
join public.team_players tp on tp.id=pd.player_id
left join public.document_requirements dr on dr.id=pd.requirement_id
left join public.organizaciones o on o.id=pd.organizacion_id
left join public.torneos t on t.id=pd.torneo_id
left join public.categorias c on c.id=pd.categoria_id
where tp.activo
  and public.apdb_document_view_allowed(
    pd.organizacion_id,pd.torneo_id,pd.categoria_id,pd.equipo_id
  );
revoke all on public.v_player_documents_admin from public,anon,authenticated;
grant select on public.v_player_documents_admin to authenticated;


-- Allow several immutable, individually auditable files for requirements
-- configured with allows_multiple_files=true (for example LDBF or insurance).
create function public.add_team_document_file(
  p_document_id uuid,p_uploaded_by text,p_storage_path text,
  p_file_name text,p_file_type text,p_file_size bigint
) returns uuid
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare v_doc public.team_documents%rowtype;
declare v_actor public.app_users%rowtype;
declare v_file_id uuid;
begin
  select * into v_doc from public.team_documents where id=p_document_id for update;
  if not found or not public.apdb_document_scope_allowed(
    v_doc.organizacion_id,v_doc.torneo_id,v_doc.categoria_id,v_doc.equipo_id,false)
    or not exists(select 1 from public.document_requirements r
      where r.id=v_doc.requirement_id and r.allows_multiple_files)
    or p_file_type not in ('application/pdf','image/png','image/jpeg')
    or p_file_size is null or p_file_size<=0 or p_file_size>10485760
    or nullif(trim(p_file_name),'') is null
    or not public.apdb_storage_path_allowed(p_storage_path,'upload')
    or split_part(p_storage_path,'/',5)<>v_doc.requirement_id::text
    or not exists(select 1 from storage.objects s
      where s.bucket_id='documentos' and s.name=p_storage_path)
  then
    raise exception using errcode='42501',message='archivo multiple fuera de alcance';
  end if;
  if exists(select 1 from public.document_files df
            where df.team_document_id=v_doc.id and df.storage_path=p_storage_path) then
    raise exception using errcode='23505',message='archivo ya incorporado';
  end if;
  select * into v_actor from public.app_users where auth_user_id=auth.uid() and active;
  insert into public.document_files(
    team_document_id,uploaded_by,storage_path,file_name,file_type,file_size
  ) values(
    v_doc.id,v_actor.display_name,p_storage_path,trim(p_file_name),p_file_type,p_file_size
  ) returning id into v_file_id;
  update public.team_documents set
    uploaded_by=v_actor.display_name,
    storage_path=coalesce(storage_path,p_storage_path),
    file_name=coalesce(file_name,trim(p_file_name)),
    file_type=coalesce(file_type,p_file_type),
    file_size=coalesce(file_size,p_file_size),
    status='cargado',observacion=null,reviewed_by=null,reviewed_at=null,
    updated_at=clock_timestamp()
  where id=v_doc.id;
  insert into public.document_events(team_document_id,event_type,actor,detail)
  values(v_doc.id,'archivo_agregado',v_actor.display_name,'Archivo multiple registrado');
  return v_file_id;
end;
$$;
revoke all on function public.add_team_document_file(uuid,text,text,text,text,bigint)
  from public,anon,authenticated;
grant execute on function public.add_team_document_file(uuid,text,text,text,text,bigint)
  to authenticated;
commit;
