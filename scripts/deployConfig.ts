export interface DeployTarget {
  type: 'production' | 'development'
  name: string
  apiUrl: string
  credentials: string
}

export const targets: DeployTarget[] = [
  {
    type: 'production',
    name: 'en',
    apiUrl: 'https://minecraft.wiki/api.php',
    credentials: 'PROD',
  },
  {
    type: 'production',
    name: 'de',
    apiUrl: 'https://de.minecraft.wiki/api.php',
    credentials: 'PROD',
  },
  {
    type: 'production',
    name: 'fr',
    apiUrl: 'https://fr.minecraft.wiki/api.php',
    credentials: 'PROD',
  },
  {
    type: 'production',
    name: 'ja',
    apiUrl: 'https://ja.minecraft.wiki/api.php',
    credentials: 'PROD',
  },
  {
    type: 'production',
    name: 'pt',
    apiUrl: 'https://pt.minecraft.wiki/api.php',
    credentials: 'PROD',
  },
  {
    type: 'production',
    name: 'ru',
    apiUrl: 'https://ru.minecraft.wiki/api.php',
    credentials: 'PROD',
  },
  {
    type: 'production',
    name: 'th',
    apiUrl: 'https://th.minecraft.wiki/api.php',
    credentials: 'PROD',
  },
  {
    type: 'production',
    name: 'uk',
    apiUrl: 'https://uk.minecraft.wiki/api.php',
    credentials: 'PROD',
  },
  {
    type: 'production',
    name: 'zh',
    apiUrl: 'https://zh.minecraft.wiki/api.php',
    credentials: 'PROD',
  },

  // Dev wikis
  // {
  //   type: 'development',
  //   name: 'en_dev',
  //   apiUrl: 'https://mc-dev.weirdgloop.org/api.php',
  //   credentials: 'DEV',
  // },
]
