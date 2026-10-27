/** Color de quién escribió una nota: lo tuyo con el color de la app, lo del otro en azul */
export function authorColor(author: string, me: string | null): string {
  return author === me ? "text-accent" : "text-sky-700";
}
