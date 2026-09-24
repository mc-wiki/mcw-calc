import { ref } from 'vue'

export type Theme = 'light' | 'dark'

export const theme = ref<Theme>('light')

export function applyTheme(nextTheme: Theme): void {
  document.body.classList.toggle('dark', nextTheme === 'dark')
  theme.value = nextTheme
}
