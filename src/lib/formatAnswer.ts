/**
 * Strips common Markdown formatting from AI-generated text before display.
 *
 * The system prompts ask the model not to use Markdown, but smaller/cheaper
 * models (like the flash-lite tier used here for cost) don't reliably follow
 * formatting instructions — so this is a display-side guarantee rather than
 * relying on the model to comply every time.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
    .replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1') // *italic* (avoid eating bullet "* ")
    .replace(/^#{1,6}\s+/gm, '') // # headings
    .replace(/`([^`]+)`/g, '$1') // `code`
    .replace(/^\s*[-*]\s+/gm, '- '); // normalize bullets to a plain dash
}
