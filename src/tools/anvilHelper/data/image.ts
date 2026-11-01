export const itemIcon = {
  enchanted_book: 'Invicon Enchanted Book.gif',
  helmet: 'Invicon Netherite Helmet.png',
  chestplate: 'Invicon Netherite Chestplate.png',
  leggings: 'Invicon Netherite Leggings.png',
  boots: 'Invicon Netherite Boots.png',
  sword: 'Invicon Netherite Sword.png',
  axe: 'Invicon Netherite Axe.png',
  mace: 'Invicon Mace.png',
  spear: 'Invicon Netherite Spear.png',
  bow: 'Invicon Bow.png',
  crossbow: 'Invicon Crossbow.png',
  pickaxe: 'Invicon Netherite Pickaxe.png',
  shovel: 'Invicon Netherite Shovel.png',
  hoe: 'Invicon Netherite Hoe.png',
  shears: 'Invicon Shears.png',
  trident: 'Invicon Trident.png',
  fishing_rod: 'Invicon Fishing Rod.png',
  elytra: 'Invicon Elytra.png',
  shield: 'Invicon Shield.png',
  brush: 'Invicon Brush.png',
  flint_and_steel: 'Invicon Flint and Steel.png',
  carrot_on_a_stick: 'Invicon Carrot on a Stick.png',
  warped_fungus_on_a_stick: 'Invicon Warped Fungus on a Stick.png',
  carved_pumpkin: 'Invicon Carved Pumpkin.png',
  compass: 'Invicon Compass.gif',
  recovery_compass: 'Invicon Recovery Compass.gif',
  heads: 'Invicon Creeper Head.png',
}

export const enchantedItemIcon = {
  enchanted_book: 'Invicon Enchanted Book.gif',
  helmet: 'Invicon Enchanted Netherite Helmet.gif',
  chestplate: 'Invicon Enchanted Netherite Chestplate.gif',
  leggings: 'Invicon Enchanted Netherite Leggings.gif',
  boots: 'Invicon Enchanted Netherite Boots.gif',
  sword: 'Invicon Enchanted Netherite Sword.gif',
  axe: 'Invicon Enchanted Netherite Axe.gif',
  mace: 'Invicon Enchanted Mace.gif',
  spear: 'Invicon Enchanted Netherite Spear.gif', //
  bow: 'Invicon Enchanted Bow.gif',
  crossbow: 'Invicon Enchanted Crossbow.gif',
  pickaxe: 'Invicon Enchanted Netherite Pickaxe.gif',
  shovel: 'Invicon Enchanted Netherite Shovel.gif',
  hoe: 'Invicon Enchanted Netherite Hoe.gif',
  shears: 'Invicon Enchanted Shears.gif',
  trident: 'Invicon Enchanted Trident.gif',
  fishing_rod: 'Invicon Enchanted Fishing Rod.gif',
  elytra: 'Invicon Enchanted Elytra.gif',
  shield: 'Invicon Enchanted Shield.gif',
  brush: 'Invicon Enchanted Brush.gif',
  flint_and_steel: 'Invicon Enchanted Flint and Steel.gif',
  carrot_on_a_stick: 'Invicon Enchanted Carrot on a Stick.gif',
  warped_fungus_on_a_stick: 'Invicon Enchanted Warped Fungus on a Stick.gif',
  carved_pumpkin: 'Invicon Enchanted Carved Pumpkin.gif', //
  compass: 'Invicon Enchanted Compass.gif', //
  recovery_compass: 'Invicon Enchanted Recovery Compass.gif', //
  heads: 'Invicon Enchanted Creeper Head.gif', //
}

export const fallbackImage = 'en:Blank.png'

const xpOrbMin = [-32767, 3, 7, 17, 37, 73, 149, 307, 617, 1237, 2477, 32768]

export function getXpOrbImageUrl(xp: number) {
  let e1 = xpOrbMin.findIndex((e) => e > xp)
  console.log(xp, e1)
  return `Experience_Orb_Value_${xpOrbMin[e1 - 1]}-${xpOrbMin[e1] - 1}.png`
}
