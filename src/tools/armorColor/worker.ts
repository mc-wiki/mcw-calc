import type { Color } from '@/utils/color'
import { rgb2lab, deltaE } from '@/utils/color'
import jeLabMain   from 'https://github.com/mc-wiki/assets/wiki-armor-dyeing/je_lab_main.zip?url'
import jeLab2x2    from 'https://github.com/mc-wiki/assets/wiki-armor-dyeing/je_lab_2x2.zip?url'
import jeLabBrown  from 'https://github.com/mc-wiki/assets/wiki-armor-dyeing/je_lab_brown.zip?url'
import jeLab143    from 'https://github.com/mc-wiki/assets/wiki-armor-dyeing/je_lab_1_4_3.zip?url'
import jeLab12w34a from 'https://github.com/mc-wiki/assets/wiki-armor-dyeing/je_lab_12w34a.zip?url'
import beLab       from 'https://github.com/mc-wiki/assets/wiki-armor-dyeing/be_lab.zip?url'

/*
function sequenceToColorJavaArmor(
  c: Color[],
  colorRgbMap: typeof javaColorRgbMap,
): [number, number, number] {
  let numberOfColors = 0
  let totalRed = 0
  let totalGreen = 0
  let totalBlue = 0
  let totalMaximum = 0
  for (const color of c) {
    totalRed = totalRed + colorRgbMap[color][0]
    totalGreen = totalGreen + colorRgbMap[color][1]
    totalBlue = totalBlue + colorRgbMap[color][2]
    totalMaximum = totalMaximum + Math.max(...colorRgbMap[color])
    numberOfColors++
  }
  const averageRed = Math.floor(totalRed / numberOfColors)
  const averageGreen = Math.floor(totalGreen / numberOfColors)
  const averageBlue = Math.floor(totalBlue / numberOfColors)
  const averageMaximum = totalMaximum / numberOfColors
  const maximumOfAverage = Math.max(averageRed, averageGreen, averageBlue)

  const gainFactor = averageMaximum / maximumOfAverage

  const resultRed = averageRed * gainFactor
  const resultGreen = averageGreen * gainFactor
  const resultBlue = averageBlue * gainFactor

  return [resultRed, resultGreen, resultBlue].map(Math.floor) as [number, number, number]
}
*/

const _24 = 2**24;
const _21 = 2**21;

class Color_Recipes{
    d: Uint32Array;
    constructor(){
        this.d = new Uint32Array(_24);
    }
    get(idx: number){
        return this.d[idx];
    }
    set(idx: number, value: number){
        this.d[idx] = value;
    }
};
/** This indicate show many crafting steps it takes to obtain a color. The max is 255 because I can't imagine needing even more. I think just 15 would be enough, but there is no need to minimize the amount of data. */
class Color_Steps{
    d: Uint8Array;
    constructor(){
        this.d = new Uint8Array(_24);
    }
    get(idx: number){
        return this.d[idx];
    }
    set(idx: number, value: number){
        this.d[idx] = value;
    }
};
class Color_Exists{
    d: Uint8Array;
    constructor(){
        this.d = new Uint8Array(_21);
    }
    get(idx: number){
        return (this.d[idx >> 3] & (1 << (idx & 7))) >> (idx & 7);
    }
    /** `value` should only be 1 bit */
    set(idx: number, value: number){
        this.d[idx >> 3] &= ~(1   << (idx & 7));
        this.d[idx >> 3] |= value << (idx & 7);
    }
};

/** 16 choose 8 with repeitions; mixers is list of lists of dye indices; */
const mixers = (function gen_mixers(dye_c, dye_lim){
    const mixers: number[][] = [];
    const mixer_a: number[] = [];
    function gen_mixers_sub(start: number, end: number, len: number){
        if(len <= 1){
            for(let i = start; i < end; i++){
                mixer_a.push(i);
                mixers.push(mixer_a.slice());
                mixer_a.pop();
            }
        }
        else{
            for(let i = start; i < end; i++){
                mixer_a.push(i);
                gen_mixers_sub(i, end, len - 1)
                mixer_a.pop();
            }
        }
    }
    for(let i = 1; i <= dye_lim; i++){
        gen_mixers_sub(0, dye_c, i);
    }
    return mixers;
})(16, 8);

const base_colors_be = [
    0xf0f0f0, /* #f0f0f0 white   */
    0x9d9d97, /* #9d9d97 l_gray  */
    0x474f52, /* #474f52 gray    */
    0x1d1d21, /* #1d1d21 black   */
    0x835432, /* #835432 brown   */
    0xb02e26, /* #b02e26 red     */
    0xf9801d, /* #f9801d orange  */
    0xfed83d, /* #fed83d yellow  */
    0x80c71f, /* #80c71f lime    */
    0x5e7c16, /* #5e7c16 green   */
    0x169c9c, /* #169c9c cyan    */
    0x3ab3da, /* #3ab3da l_blue  */
    0x3c44aa, /* #3c44aa blue    */
    0x8932b8, /* #8932b8 purple  */
    0xc74ebd, /* #c74ebd magenta */
    0xf38baa, /* #f38baa pink    */
];
const base_colors_names = [
    "white",     /* #f9fffe  0 */
    "lightGray", /* #9d9d97  1 */
    "gray",      /* #474f52  2 */
    "black",     /* #1d1d21  3 */
    "brown",     /* #835432  4 */
    "red",       /* #b02e26  5 */
    "orange",    /* #f9801d  6 */
    "yellow",    /* #fed83d  7 */
    "lime",      /* #80c71f  8 */
    "green",     /* #5e7c16  9 */
    "cyan",      /* #169c9c 10 */
    "lightBlue", /* #3ab3da 11 */
    "blue",      /* #3c44aa 12 */
    "purple",    /* #8932b8 13 */
    "magenta",   /* #c74ebd 14 */
    "pink",      /* #f38baa 15 */
];

let found = 0;
// index of the last mixer used;
const recipes = new Color_Recipes();
// the last color used; for any i, if there is no last color, then last_cs[i] === i;
const last_cs = new Color_Recipes();
// closest color in Lab space for unobtainable colors;
const closest = new Color_Recipes();
// the number of crafting steps required to make the color;
const step_cs = new Color_Steps();
// whether the color exists; it's easiest to encode this piece of data separately;
const c_exists = new Color_Exists();

function recipe_je(later_steps: number[], color: number){
    const last = last_cs.get(color);
    later_steps.push(recipes.get(color));
    if(last === color){
        return;
    }
    recipe_je(later_steps, last);
}

function recipe_be(later_steps: number[], color: number){
    const data = recipes.get(color);
    // if(!(data & 0x80)){
    //     throw new Error("Color not found: " + color + ", steps: " + later_steps);
    // }
    const dye_i = data & 0x0f;
    const last = base_colors_be[dye_i];
    const cr = (color & 0xff0000) >> 16;
    const cg = (color & 0x00ff00) >> 8;
    const cb = (color & 0x0000ff);
    const lr = (last  & 0xff0000) >> 16;
    const lg = (last  & 0x00ff00) >> 8;
    const lb = (last  & 0x0000ff);
    if(cr == lr && cg == lg && cb == lb){
        // end of tail end recursion;
        return;
    }
    later_steps.push(dye_i);
    const r = (2 * cr - lr) + ((data & 0x40) >> 6);
    const g = (2 * cg - lg) + ((data & 0x20) >> 5);
    const b = (2 * cb - lb) + ((data & 0x10) >> 4);
    // end of tail end recursion;
    recipe_be(later_steps, (r << 16) | (g << 8) | b);
}

function colorToSequenceJava(targetColor: number){
  const res: number[] = [];
  recipe_je(res, targetColor);
  // TypeScript has no toReversed?
  res.reverse();
  return res.map(i => mixers[i]);
}
const colorToSequenceJava2x2    = colorToSequenceJava;
const colorToSequenceJavaBrown  = colorToSequenceJava;
const colorToSequenceJava1_4_3  = colorToSequenceJava;
const colorToSequenceJava12w34a = colorToSequenceJava;
function colorToSequenceBedrock(targetColor: number){
  const res: number[] = [];
  recipe_be(res, targetColor);
  res.reverse();
  return [res];
}

function load_je(data: Uint8Array){
    console.log("Loading...");
    
    const save_size = _24 * 4 + _24 * 4 + _24 * 4 + _24 + _21;
    if(data.length !== save_size){
        throw new RangeError(`Expected ${save_size} bytes, but got ${data.length} bytes.`);
    }
    
    // data is SoA: recipes, then last_cs, then closest, then step_cs, then c_exists;
    let i = 0;
    for(let j = 0; j < _24; j++, i += 4){
        recipes.d[j] = (
            (data[i    ] << 24) |
            (data[i + 1] << 16) |
            (data[i + 2] <<  8) |
            (data[i + 3]      )
        );
    }
    for(let j = 0; j < _24; j++, i += 4){
        last_cs.d[j] = (
            (data[i    ] << 24) |
            (data[i + 1] << 16) |
            (data[i + 2] <<  8) |
            (data[i + 3]      )
        );
    }
    for(let j = 0; j < _24; j++, i += 4){
        closest.d[j] = (
            (data[i    ] << 24) |
            (data[i + 1] << 16) |
            (data[i + 2] <<  8) |
            (data[i + 3]      )
        );
    }
    for(let j = 0; j < _24; j++, i++){
        step_cs.d[j] = data[i];
    }
    for(let j = 0; j < _21; j++, i++){
        c_exists.d[j] = data[i];
    }
    
    console.log("Loaded!");
    
    found = 0;
    for(let j = 0; j < _24; j++){
        if(c_exists.get(j)) found++;
    }
}
function load_be(data: Uint8Array){
    console.log("Loading...");
    
    const save_size = _24 + _24 * 4;
    if(data.length !== save_size){
        throw new RangeError(`Expected ${save_size} bytes, but got ${data.length} bytes.`);
    }
    
    // data is SoA: recipes, then closest;
    let i = 0;
    // recipes themselves is a bitpacked AoS: c_exists bit, 3 parity bits, last_dye_i;
    // but we don't need to process it much;
    for(let j = 0; j < _24; j++, i++){
        recipes.d[j] = data[i];
        c_exists.set(j, (data[i] & 0x80) >> 7);
    }
    for(let j = 0; j < _24; j++, i += 4){
        closest.d[j] = (
            (data[i    ] << 24) |
            (data[i + 1] << 16) |
            (data[i + 2] <<  8) |
            (data[i + 3]      )
        );
    }
    
    console.log("Loaded!");
    
    found = 0;
    for(let j = 0; j < _24; j++){
        if(c_exists.get(j)) found++;
    }
}
let load_e: (data: Uint8Array) => void = load_je;

async function handle_zip_file(buffer: ArrayBuffer){
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let eocd_offset = -1;
    for(let i = bytes.length - 22; i >= 0; i--){
        if(view.getUint32(i, true) === 0x06054b50){
            eocd_offset = i;
            break;
        }
    }
    
    if(eocd_offset === -1){
        throw new Error('Could not find Central Directory in ZIP');
    }
    
    // read offset of the Central Directory
    const cd_offset = view.getUint32(eocd_offset + 16, true);
    
    // make sure Central Directory Header signature is correct
    if(view.getUint32(cd_offset, true) !== 0x02014b50){
        throw new Error('Invalid Central Directory Header');
    }
    
    // pray we get the correct size
    const method         = view.getUint16(cd_offset + 10, true);
    const compressedSize = view.getUint32(cd_offset + 20, true);
    const localOffset    = view.getUint32(cd_offset + 42, true);
    
    const name_len  = view.getUint16(localOffset + 26, true);
    const extra_len = view.getUint16(localOffset + 28, true);
    const data_offset = localOffset + 30 + name_len + extra_len;
    
    const compressed = buffer.slice(data_offset, data_offset + compressedSize);
    
    if(method === 0){
        return new Uint8Array(compressed);
    }
    
    if(method === 8){
        const decompressed_stream = new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
            
        const array_buffer = await new Response(decompressed_stream).arrayBuffer();
        return new Uint8Array(array_buffer);
    }
    
    throw new Error(`Unsupported compression method: ${method}`);
}

let local_path = "";
async function load_local(){
    console.log("attempting to fetch local data");
    const response = await fetch(local_path);
    if(!response.ok) throw new Error(`HTTP error! status: ${response.status}`);  
    
    const buffer = await response.arrayBuffer();
    const raw_bytes = await handle_zip_file(buffer);
    load_e(raw_bytes);
}

/** Colors used from 17w06a to now. */
export async function load_f_main(){
    load_e = load_je;
    local_path = jeLabMain;
    await load_local();
    return found;
};
/** Colors used from 17w06a to now (2x2 crafting grid). */
export async function load_f_2x2(){
    load_e = load_je;
    local_path = jeLab2x2;
    await load_local();
    return found;
};
/** Colors used from 17w06a to now (using the minimum amount of brown dye). */
export async function load_f_brown(){
    load_e = load_je;
    local_path = jeLabBrown;
    await load_local();
    return found;
};
/** Colors used from 1.4.3 to 17w06a. */
export async function load_f_1_4_3(){
    load_e = load_je;
    local_path = jeLab143;
    await load_local();
    return found;
};
/** Colors used from 12w34a (when armor dyeing was first added) to 1.4.3. The colors themselves were added in Beta 1.2, before armor dyeing was a mechanic. */
export async function load_f_12w34a(){
    load_e = load_je;
    local_path = jeLab12w34a;
    await load_local();
    return found;
};
/** BE colors and cauldron recipes. */
export async function load_f_be(){
    load_e = load_be;
    local_path = beLab;
    await load_local();
    return found;
};

function handler(f: (targetColor: number) => number[][], targetColor: [number, number, number]): [Color[][], number, [number, number, number]]{
  const tColor = (targetColor[0] << 16) | (targetColor[1] << 8) | targetColor[2];
  const aColor = c_exists.get(tColor) ? tColor : closest.get(tColor);
  const approxColor: [number, number, number] = [(aColor & 0xff0000) >> 16, (aColor & 0x00ff00) >> 8, aColor & 0x0000ff];
  const res: number[][] = f(aColor);
  const colorNames = res.map(v => v.map(i => (base_colors_names[i] as Color)));
  const de = deltaE(rgb2lab(targetColor), rgb2lab(approxColor));
  return [colorNames, de, approxColor];
}

export async function colorToSequence(
  targetColor: [number, number, number],
  edition: 'java' | 'java_2x2' | 'java_brown' | 'java_1_4_3' | 'java_12w34a' | 'bedrock',
) {
  return handler(
    edition === 'java'        ? colorToSequenceJava       :
    edition === 'java_2x2'    ? colorToSequenceJava2x2    :
    edition === 'java_brown'  ? colorToSequenceJavaBrown  :
    edition === 'java_1_4_3'  ? colorToSequenceJava1_4_3  :
    edition === 'java_12w34a' ? colorToSequenceJava12w34a :
    colorToSequenceBedrock,
    targetColor,
  )
}
