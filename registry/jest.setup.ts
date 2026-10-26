// Reanimated 4 + worklets in Jest: use the mocks both packages ship (animations become instant no-ops).
require('react-native-reanimated').setUpTests()
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(async () => {}), notificationAsync: jest.fn(async () => {}), selectionAsync: jest.fn(async () => {}), ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Success: 'success' } }))
jest.mock('expo-blur', () => ({ BlurView: ({ children }: { children?: unknown }) => children ?? null }))
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }))
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(async () => ({ canceled: true })), launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })) }))
