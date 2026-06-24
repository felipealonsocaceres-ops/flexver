/**
 * Código de entrega del flete: 4 dígitos derivados de forma DETERMINISTA del
 * id_flete (UUID). El cliente lo muestra y el conductor lo pide al finalizar.
 * Al ser determinista, ambos calculan el mismo valor sin necesidad de una
 * columna extra en la base de datos (es de prueba, pero verifica de verdad).
 */
export function codigoDeFlete(idFlete: string): string {
  // Hash djb2 simple sobre el string del UUID.
  let hash = 5381
  for (let i = 0; i < idFlete.length; i++) {
    hash = ((hash << 5) + hash + idFlete.charCodeAt(i)) >>> 0
  }
  return String(hash % 10000).padStart(4, '0')
}
