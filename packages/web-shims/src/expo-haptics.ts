// Browser stand-in for expo-haptics: best-effort `navigator.vibrate`, otherwise a no-op.
export enum ImpactFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Rigid = 'rigid',
  Soft = 'soft',
}
export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}
export enum AndroidHaptics {
  Confirm = 'confirm',
  Reject = 'reject',
}
const vibrate = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
export async function impactAsync(style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium): Promise<void> {
  vibrate(style === ImpactFeedbackStyle.Light || style === ImpactFeedbackStyle.Soft ? 8 : 14)
}
export async function notificationAsync(_type: NotificationFeedbackType = NotificationFeedbackType.Success): Promise<void> {
  vibrate([10, 30, 10])
}
export async function selectionAsync(): Promise<void> {
  vibrate(5)
}
export async function performAndroidHapticsAsync(_type: AndroidHaptics): Promise<void> {
  vibrate(8)
}
