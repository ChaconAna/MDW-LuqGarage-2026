export function esFechaSiniestroValida(
  fechaSiniestro: Date,
  fechaRegistro: Date,
): boolean {
  return fechaSiniestro <= fechaRegistro;
}
