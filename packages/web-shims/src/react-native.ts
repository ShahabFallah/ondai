// `react-native` on the web = react-native-web plus stubs for native-module registries that some
// libraries (react-native-svg, gesture handlers) import at module scope. Calls become no-ops.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore react-native-web ships no types
export * from 'react-native-web'

const noop = () => undefined
const noopModule: Record<string, (...args: unknown[]) => unknown> = new Proxy(
  {},
  { get: (_t, key) => (key === 'then' ? undefined : typeof key === 'string' && /^[A-Z_]+$/.test(key) ? key : noop) },
)

export const TurboModuleRegistry = {
  get: (_name: string) => null,
  getEnforcing: (_name: string) => noopModule,
}

export const NativeModules: Record<string, unknown> = new Proxy({}, { get: (_t, key) => (key === 'then' ? undefined : noopModule) })

export class NativeEventEmitter {
  addListener() {
    return { remove: noop }
  }
  removeAllListeners() {}
  removeSubscription() {}
  emit() {}
  listenerCount() {
    return 0
  }
}

export const requireNativeComponent = (_name: string) => 'div'
