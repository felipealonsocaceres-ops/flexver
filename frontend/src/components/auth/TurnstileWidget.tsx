import { useId } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { ShieldCheck } from 'lucide-react'

// Site Key de Cloudflare Turnstile. En producción se inyecta por variable de
// entorno; el fallback es la clave PÚBLICA de pruebas de Cloudflare
// (`1x00000000000000000000AA`) que siempre aprueba el desafío.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'

type TurnstileWidgetProps = {
  // Reporta hacia arriba el token vigente (string) o `null` cuando expira/falla.
  // El formulario usa esto para habilitar/bloquear el botón de submit.
  onVerify: (token: string | null) => void
}

// Envoltorio del desafío anti-bot de Cloudflare con la estética oscura/glass de
// FlexVer. Centraliza tema, tamaño y manejo de expiración para reutilizarlo
// tanto en Login como en Registro.
export default function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const labelId = useId()

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span id={labelId} className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
        Verificación de seguridad
      </span>
      <Turnstile
        siteKey={SITE_KEY}
        aria-labelledby={labelId}
        options={{ theme: 'dark', size: 'flexible' }}
        onSuccess={(token) => onVerify(token)}
        onError={() => onVerify(null)}
        onExpire={() => onVerify(null)}
        className="w-full"
      />
    </div>
  )
}
