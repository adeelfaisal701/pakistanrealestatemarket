/**
 * Escapes all RegExp metacharacters so user input is matched literally.
 * Use before passing public query parameters to `new RegExp(...)`.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
