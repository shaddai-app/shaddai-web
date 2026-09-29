/** Tamaño de letra inicial del modo escenario según el ancho de la pantalla (celular → tablet). */
export function stageFontSize(width: number) {
  if (width < 500) return 18;
  if (width < 900) return 22;
  return 26;
}
