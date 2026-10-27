/**
 * Types `text` into the first text input under `root` the way a visitor would, so the
 * react-native-web TextInput's onChange fires, then focuses it. Used by the example chips.
 */
export function fillInput(root: HTMLElement | null, text: string): boolean {
  const input = root?.querySelector<HTMLInputElement>('input, textarea')
  if (!input) return false
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(input, text)
  else input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.focus({ preventScroll: true })
  try {
    input.setSelectionRange(text.length, text.length)
  } catch {
    /* number inputs etc. */
  }
  return true
}
