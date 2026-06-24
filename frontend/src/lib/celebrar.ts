import confetti from 'canvas-confetti'

// Lluvia de confeti con los colores de marca. Se usa al completar un viaje o
// aprobar un pago — pequeño detalle que da mucho "wow" en la demo.
export function celebrar() {
  const colores = ['#8B5CF6', '#1A73E8', '#22d3ee', '#facc15', '#34d399']
  const fin = Date.now() + 900

  // Estallido central inicial.
  confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.6 }, colors: colores })

  // Cañones laterales que disparan durante ~1s.
  ;(function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: colores })
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: colores })
    if (Date.now() < fin) requestAnimationFrame(frame)
  })()
}
