export function detectSubdomain(text: string): boolean {
  return text.trimStart().startsWith('d5-subdomain');
}
