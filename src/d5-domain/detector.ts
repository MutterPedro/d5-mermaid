export function detectDomain(text: string): boolean {
  return text.trimStart().startsWith('d5-domain');
}
