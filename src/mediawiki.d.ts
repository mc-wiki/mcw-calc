import 'types-mediawiki'

declare module 'vue' {
  export const createMwApp: typeof import('vue').createApp
  interface ComponentCustomProperties {
    $i18n: typeof mw.message
  }
}

declare global {
  const __non_webpack_require__: <T = any>(id: string) => T
  const __webpack_runtime_id__: string
  const __TOOL_NAME__: string
}
