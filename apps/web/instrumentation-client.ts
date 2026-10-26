// Runs before hydration. react-native-reanimated reads __DEV__ inside function bodies on web.
;(globalThis as unknown as { __DEV__: boolean }).__DEV__ = process.env.NODE_ENV !== 'production'
