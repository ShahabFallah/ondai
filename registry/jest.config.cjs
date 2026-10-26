/** Component tests run with jest-expo (the only maintained preset for Reanimated + RN 0.88). */
module.exports = {
  preset: 'jest-expo/ios',
  rootDir: __dirname,
  testMatch: ['<rootDir>/components/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|react-native-reanimated|react-native-worklets|@ondai/.*|ai|@ai-sdk/.*)/)'],
  moduleNameMapper: { '^@ondai/registry/components/(.*)$': '<rootDir>/components/$1' },
}
