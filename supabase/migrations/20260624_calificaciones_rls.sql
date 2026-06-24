-- ============================================================================
--  FlexVer · Migración: RLS de la tabla `calificaciones`
--  Fecha: 2026-06-24
--  Cómo aplicar: Supabase Dashboard -> SQL Editor -> pega y ejecuta este archivo.
--  Es idempotente: se puede correr varias veces sin romper nada.
--
--  Problema que resuelve:
--    Al calificar al conductor el cliente recibía:
--      "new row violates row-level security policy for table calificaciones" (403)
--    porque la tabla tiene RLS activada pero NO tenía política de INSERT.
--
--  Modelo de datos relevante:
--    · calificaciones.id_flete     -> fletes.id_flete
--    · calificaciones.id_conductor -> conductores.id_conductor
--    · fletes.id_usuario           = auth.uid() del cliente dueño del flete
--    · conductores.id_usuario      = auth.uid() del conductor
-- ============================================================================

alter table public.calificaciones enable row level security;

-- --- INSERT: el cliente califica un flete que le pertenece --------------------
-- El WITH CHECK garantiza que solo se pueda crear una calificación para un
-- flete cuyo dueño (fletes.id_usuario) sea el usuario autenticado. La subconsulta
-- a `fletes` respeta su propia RLS (el cliente ya puede leer sus fletes).
drop policy if exists "calificaciones_cliente_insert" on public.calificaciones;
create policy "calificaciones_cliente_insert"
on public.calificaciones for insert
to authenticated
with check (
  id_flete in (
    select f.id_flete from public.fletes f where f.id_usuario = auth.uid()
  )
);

-- --- SELECT: el cliente ve las calificaciones de sus fletes; el conductor las suyas
drop policy if exists "calificaciones_select" on public.calificaciones;
create policy "calificaciones_select"
on public.calificaciones for select
to authenticated
using (
  id_flete in (
    select f.id_flete from public.fletes f where f.id_usuario = auth.uid()
  )
  or id_conductor in (
    select c.id_conductor from public.conductores c where c.id_usuario = auth.uid()
  )
);
