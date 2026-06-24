-- ============================================================================
--  FlexVer · Migración: trigger updated_at + RLS de la tabla `fletes`
--  Fecha: 2026-06-24
--  Cómo aplicar: Supabase Dashboard -> SQL Editor -> pega y ejecuta este archivo.
--  Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) TRIGGER: refresca updated_at en CADA UPDATE de fletes.
--    Resuelve que updated_at solo se llenaba en el INSERT (default now()).
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fletes_updated_at on public.fletes;
create trigger trg_fletes_updated_at
before update on public.fletes
for each row
execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 2) REALTIME: asegura que la tabla fletes publique sus cambios.
--    (Equivale a activar Replication para `fletes` en el dashboard.)
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.fletes;
exception
  when others then null; -- ya estaba en la publicación: lo ignoramos
end $$;


-- ----------------------------------------------------------------------------
-- 2.5) id_tarifa NULLABLE: la tarifa ahora la calcula el motor de precios del
--      backend (FastAPI), ya no se referencia una fila de la tabla `tarifas`.
--      Hacemos la columna opcional para que el INSERT del cliente no falle.
--      Idempotente: DROP NOT NULL no rompe si ya es nullable.
--      (IF EXISTS evita error si la columna no existe en este entorno.)
-- ----------------------------------------------------------------------------
do $$
begin
  alter table public.fletes alter column id_tarifa drop not null;
exception
  when undefined_column then null; -- la columna no existe: lo ignoramos
end $$;


-- ----------------------------------------------------------------------------
-- 3) RLS: políticas de acceso a `fletes`.
--    Recordatorio del modelo de datos:
--      · fletes.id_usuario   -> usuarios.id_usuario     (= auth.uid() del cliente)
--      · fletes.id_conductor -> conductores.id_conductor (PK propio del conductor)
--      · conductores.id_usuario = auth.uid() del conductor
--    Por eso, para saber si el usuario logueado "es" un conductor dueño de la
--    fila, comparamos vía subconsulta a conductores.
-- ----------------------------------------------------------------------------
alter table public.fletes enable row level security;

-- --- CLIENTE -----------------------------------------------------------------

-- El cliente ve solo sus propios fletes.
drop policy if exists "fletes_cliente_select" on public.fletes;
create policy "fletes_cliente_select"
on public.fletes for select
to authenticated
using (id_usuario = auth.uid());

-- El cliente crea fletes a su nombre.
drop policy if exists "fletes_cliente_insert" on public.fletes;
create policy "fletes_cliente_insert"
on public.fletes for insert
to authenticated
with check (id_usuario = auth.uid());

-- El cliente actualiza / cancela SUS fletes (no puede cambiar el dueño).
drop policy if exists "fletes_cliente_update" on public.fletes;
create policy "fletes_cliente_update"
on public.fletes for update
to authenticated
using (id_usuario = auth.uid())
with check (id_usuario = auth.uid());

-- --- CONDUCTOR ---------------------------------------------------------------

-- El conductor ve los fletes disponibles (para recibir ofertas en Realtime)
-- y los que ya tiene asignados.
drop policy if exists "fletes_conductor_select" on public.fletes;
create policy "fletes_conductor_select"
on public.fletes for select
to authenticated
using (
  estado = 'buscando_conductor'
  or id_conductor in (
    select c.id_conductor from public.conductores c where c.id_usuario = auth.uid()
  )
);

-- El conductor puede:
--   · ACEPTAR un flete disponible (estado = 'buscando_conductor'), o
--   · avanzar el estado de un flete que YA es suyo (en_camino, entregado, etc.).
-- El WITH CHECK garantiza que la fila quede con SU id_conductor (no puede
-- asignársela a otro). Un usuario sin perfil de conductor -> subconsulta vacía
-- -> el WITH CHECK falla -> no puede actualizar.
drop policy if exists "fletes_conductor_update" on public.fletes;
create policy "fletes_conductor_update"
on public.fletes for update
to authenticated
using (
  estado = 'buscando_conductor'
  or id_conductor in (
    select c.id_conductor from public.conductores c where c.id_usuario = auth.uid()
  )
)
with check (
  id_conductor in (
    select c.id_conductor from public.conductores c where c.id_usuario = auth.uid()
  )
);

-- --- DEPENDENCIA: conductores ------------------------------------------------
-- Las policies de arriba consultan `conductores` por subquery, y esa subquery
-- respeta la RLS de `conductores`. Si `conductores` tiene RLS activada sin una
-- policy de lectura propia, el conductor no vería su id_conductor y no podría
-- aceptar. Esta policy lo garantiza (si la RLS de conductores está apagada,
-- existir la policy no hace daño: simplemente no se evalúa).
drop policy if exists "conductores_self_select" on public.conductores;
create policy "conductores_self_select"
on public.conductores for select
to authenticated
using (id_usuario = auth.uid());
