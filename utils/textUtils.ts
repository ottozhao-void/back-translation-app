
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  // Match sentences ending with punctuation or the end of the string
  // Includes English (.!?) and Chinese (。！？)
  // We trim whitespace from the result
  const matches = text.match(/[^.!?。！？\n]+[.!?。！？\n]*|[^.!?。！？\n]+$/g);
  if (!matches) return [text];
  return matches.map(s => s.trim()).filter(s => s.length > 0);
}
