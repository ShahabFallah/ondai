// Reanimated 4 in Jest: its resolver swaps web-only modules; setUpTests makes animations instant.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
require('react-native-reanimated').setUpTests()
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(async () => {}), notificationAsync: jest.fn(async () => {}), selectionAsync: jest.fn(async () => {}), ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Success: 'success' } }))
jest.mock('expo-blur', () => ({ BlurView: ({ children }: { children?: unknown }) => children ?? null }))
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }))
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(async () => ({ canceled: true })), launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })) }))
