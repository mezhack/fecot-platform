/**
 * Lista de graduações do Taekwondo — espelho do backend
 * (app/core/graduations.py).
 *
 * O backend armazena exatamente estas strings no campo `graduation`,
 * então aqui usamos os mesmos valores pra não precisar traduzir.
 */

export const GRADUATIONS: string[] = [
  "10º Gub",
  "9º Gub",
  "8º Gub",
  "7º Gub",
  "6º Gub",
  "5º Gub",
  "4º Gub",
  "3º Gub",
  "2º Gub",
  "1º Gub",
  "1º Dan",
  "2º Dan",
  "3º Dan",
  "4º Dan",
  "5º Dan",
  "6º Dan",
  "7º Dan",
  "8º Dan",
  "9º Dan",
  "10º Dan",
]

// Labels opcionais para exibição mais descritiva
const GRADUATION_LABELS: Record<string, string> = {
  "10º Gub": "10º Gub (Branca)",
  "9º Gub": "9º Gub (Branca Ponta Amarela)",
  "8º Gub": "8º Gub (Amarela)",
  "7º Gub": "7º Gub (Amarela Ponta Verde)",
  "6º Gub": "6º Gub (Verde)",
  "5º Gub": "5º Gub (Verde Ponta Azul)",
  "4º Gub": "4º Gub (Azul)",
  "3º Gub": "3º Gub (Azul Ponta Vermelha)",
  "2º Gub": "2º Gub (Vermelha)",
  "1º Gub": "1º Gub (Vermelha Ponta Preta)",
}

export function getGraduationLabel(graduation: string): string {
  return GRADUATION_LABELS[graduation] ?? graduation
}

export function isDanRank(graduation: string): boolean {
  return graduation.includes("Dan")
}

/** Regra do backend: 1º ao 10º Dan pode ser professor. */
export function canBeProfessor(graduation: string): boolean {
  return /^([1-9]|10)º Dan$/.test(graduation)
}
