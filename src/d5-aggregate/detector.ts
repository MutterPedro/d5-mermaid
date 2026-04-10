export function detectAggregate(text: string): boolean {
  return text.trimStart().startsWith('d5-aggregate');
}
