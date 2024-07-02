export function getJigsawAPI() {
  return localStorage.getItem('mcwJigsawLocal') === 'true'
    ? 'http://localhost:3000'
    : 'https://tools.minecraft.wiki'
}

export function fetchJigsawAPI(path: string, init?: RequestInit) {
  return fetch(`${getJigsawAPI()}/${path}`, init)
}