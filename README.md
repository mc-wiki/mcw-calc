# Minecraft Wiki Interactive Tools

This is a repo for Vue apps and the build system (powered by Webpack) used by the MCW Interactive Tools project, which is aimed to explore how interactive tools and calculators might benefit reader experience.

If you are interested in this project, feel free to join the thread in #project-forum on MCW Discord.

## Development

1. Clone the repo
2. Run `pnpm install` (if you don't have pnpm installed then install it first using `corepack prepare pnpm@latest --activate`)
3. Run `pnpm run dev`
4. Add this to your common.js: `mw.loader.load('http://localhost:8080/Gadget-mcw-calc-core.js')`
5. Go to User:Dianliang233/calc for a list of all tools; to invoke a specific tool use this `<div class="mcw-calc" data-type="(TOOL NAME GOES HERE)"></div>`
