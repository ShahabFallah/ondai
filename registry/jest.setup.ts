import '@testing-library/react-native/extend-expect'
// Reanimated test mode: animations resolve immediately.
require('react-native-reanimated').setUpTests()
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(async () => {}), notificationAsync: jest.fn(async () => {}), selectionAsync: jest.fn(async () => {}), ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Success: 'success' } }))
jest.mock('expo-blur', () => ({ BlurView: ({ children }: { children?: unknown }) => children ?? null }))
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }))
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(async () => ({ canceled: true })), launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })) }))
