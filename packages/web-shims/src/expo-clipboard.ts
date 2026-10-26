export async function setStringAsync(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
export async function getStringAsync(): Promise<string> {
  try {
    return await navigator.clipboard.readText()
  } catch {
    return ''
  }
}
export async function hasStringAsync(): Promise<boolean> {
  return (await getStringAsync()).length > 0
}
