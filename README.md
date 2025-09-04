# Minecraft Wiki Interactive Tools

This is a repo for Vue apps and the build system (powered by vite) used by the MCW Interactive Tools project, aiming to explore how interactive tools and calculators might benefit reader experience.

If you are interested in this project, feel free to join the thread in #project-forum on MCW Discord.

## How it works

The tools are built using Vue 3 and Vite. Each tool is an independent Vue app that is designed to run in an iframe on the wiki. The tools are built and deployed to a static site, and the wiki loads the tools in an iframe.

## Development

1. Clone the repo
2. Run `pnpm install` (if you don't have pnpm installed then install it first using `corepack prepare pnpm@latest --activate`)
3. Run `pnpm run dev`
4. Run this in your browser console with MCW open: `localStorage.setItem('mcwCalcLocal', 'true')`
5. Go to User:Dianliang233/calc-sandbox for a list of all tools; to invoke a specific tool use this `<div id="app"></div>`
6. If you want to quit development mode, don't forget to run `localStorage.setItem('mcwCalcLocal', 'false')`
