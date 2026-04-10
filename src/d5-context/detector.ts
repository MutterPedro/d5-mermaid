export function detectContext(text: string): boolean {
  return text.trimStart().startsWith('d5-context');
}
