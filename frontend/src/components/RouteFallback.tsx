/**
 * RouteFallback
 * Loader mostrado mientras un chunk de ruta (React.lazy) se descarga.
 * Tarjeta "glass" con el ícono de FlexVer pulsando + halo violeta.
 * Pensado para no provocar layout shift: ocupa el viewport completo y centra.
 */
const RouteFallback = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 px-10 py-8 shadow-2xl backdrop-blur-xl">
        {/* Ícono FlexVer: cuadro de cristal con halo violeta pulsante */}
        <div className="relative h-14 w-14">
          <span className="absolute inset-0 animate-ping rounded-xl bg-[var(--color-primario)]/40" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primario)] to-[var(--color-secundario)] text-2xl font-black text-white shadow-lg">
            F
          </span>
        </div>
        <p className="animate-pulse text-sm font-medium tracking-wide text-slate-200/80">
          Cargando FlexVer…
        </p>
      </div>
      <span className="sr-only">Cargando contenido</span>
    </div>
  );
};

export default RouteFallback;
