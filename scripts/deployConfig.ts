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
  // {
  //   type: 'production',
  //   name: 'zh',
  //   apiUrl: 'https://zh.minecraft.wiki/api.php',
  //   credentials: 'PROD',
  // },
  {
    type: 'development',
    name: 'en_dev',
    apiUrl: 'https://mc-dev.weirdgloop.org/api.php',
    credentials: 'DEV',
  },
]
