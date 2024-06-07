# Minecraft Wiki Interactive Tools

This is a repo for Vue apps and the build system (powered by Webpack) used by the MCW Interactive Tools project, which is aimed to explore how interactive tools and calculators might benefit reader experience.

If you are interested in this project, feel free to join the thread in #project-forum on MCW Discord.

## Development

1. Clone the repo
2. Run `pnpm install` (if you don't have pnpm installed then install it first using `corepack prepare pnpm@latest --activate`)
3. Run `pnpm run dev`
4. Run this in your browser console with MCW open: `localStorage.setItem('mcwCalcLocal', 'true')`
5. Go to User:Dianliang233/calc-sandbox for a list of all tools; to invoke a specific tool use this `<div id="app"></div>`
6. If you want to quit development mode, don't forget to run `localStorage.setItem('mcwCalcLocal', 'false')`
