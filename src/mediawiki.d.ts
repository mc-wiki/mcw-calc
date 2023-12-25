import 'types-mediawiki'

declare module 'vue' {
  export const createMwApp: typeof import('vue').createApp
  interface ComponentCustomProperties {
    $i18n: typeof mw.message
  }
}
