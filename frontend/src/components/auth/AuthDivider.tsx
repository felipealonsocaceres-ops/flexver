// Separador visual elegante entre el formulario de credenciales y el bloque de
// social login. Por defecto: "O continuar con".
export default function AuthDivider({ label = 'O continuar con' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-white/15" />
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-white/15" />
    </div>
  )
}
