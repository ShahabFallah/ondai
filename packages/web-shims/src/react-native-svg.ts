// Turbopack does not apply `.web.js` resolution inside node_modules, so re-export the real
// react-native-svg web renderer explicitly.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - deep import of the web implementation
export * from 'react-native-svg/lib/module/elements.web.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export { default } from 'react-native-svg/lib/module/elements.web.js'
