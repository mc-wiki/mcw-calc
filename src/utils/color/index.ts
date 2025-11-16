
/** written by Copilot, because I was tired of trying to install a library for it; */
class MinHeap {
  private heap: [number, number][] = [] // [value, priority]
  add(item: [number, number]) {
    this.heap.push(item)
    this._siftUp(this.heap.length - 1)
  }
  removeRoot(): [number, number] | undefined {
    if (this.heap.length === 0) return undefined
    const root = this.heap[0]
    const last = this.heap.pop()
    if (this.heap.length > 0 && last) {
      this.heap[0] = last
      this._siftDown(0)
    }
    return root
  }
  isEmpty(): boolean {
    return this.heap.length === 0
  }
  private _siftUp(idx: number) {
    const item = this.heap[idx]
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2)
      if (this.heap[parentIdx][1] <= item[1]) break
      this.heap[idx] = this.heap[parentIdx]
      idx = parentIdx
    }
    this.heap[idx] = item
  }
  private _siftDown(idx: number) {
    const item = this.heap[idx]
    const len = this.heap.length
    while (true) {
      let smallest = idx
      const left = 2 * idx + 1
      const right = 2 * idx + 2
      if (left < len && this.heap[left][1] < this.heap[smallest][1]) smallest = left
      if (right < len && this.heap[right][1] < this.heap[smallest][1]) smallest = right
      if (smallest === idx) break
      this.heap[idx] = this.heap[smallest]
      idx = smallest
    }
    this.heap[idx] = item
  }
}

/* == Color maps == */

const c_je = [
  0x1D1D21, // black       0;
  0x474F52, // gray        1;
  0x9D9D97, // light_gray  2;
  0xF9FFFE, // white       3;
  0x835432, // brown       4;
  0xB02E26, // red         5;
  0xF9801D, // orange      6;
  0xFED83D, // yellow      7;
  0x80C71F, // lime        8;
  0x5E7C16, // green       9;
  0x169C9C, // cyan       10;
  0x3AB3DA, // light_blue 11;
  0x3C44AA, // blue       12;
  0x8932B8, // purple     13;
  0xC74EBD, // magenta    14;
  0xF38BAA, // pink       15;
];
const c_be = [
  0x1D1D21, // black       0;
  0x474F52, // gray        1;
  0x9D9D97, // light_gray  2;
  0xF0F0F0, // white       3;
  0x835432, // brown       4;
  0xB02E26, // red         5;
  0xF9801D, // orange      6;
  0xFED83D, // yellow      7;
  0x80C71F, // lime        8;
  0x5E7C16, // green       9;
  0x169C9C, // cyan       10;
  0x3AB3DA, // light_blue 11;
  0x3C44AA, // blue       12;
  0x8932B8, // purple     13;
  0xC74EBD, // magenta    14;
  0xF38BAA, // pink       15;
];

/* == Mix functions == */
/** @param cs raw color values */
function mix_je(...cs: number[]){
  let tr = 0, tg = 0, tb = 0, tm = 0;
  for(const c of cs){
    tr += (c >> 16) & 0xff;
    tg += (c >>  8) & 0xff;
    tb += (c >>  0) & 0xff;
    tm += Math.max((c >> 16) & 0xff, (c >>  8) & 0xff, (c >>  0) & 0xff);
  }
  // alpha
  const a = (
    tm / cs.length /
    Math.max(
      Math.floor(tr / cs.length),
      Math.floor(tg / cs.length),
      Math.floor(tb / cs.length),
    )
  );
  // lerping
  return (
    ((Math.floor(tr / cs.length) * a) << 16) |
    ((Math.floor(tg / cs.length) * a) <<  8) |
    ((Math.floor(tb / cs.length) * a) <<  0)
  );
}

/** Add a dye to existing water. c = water; c_e = dye; */
function mix_be_step(c: [number, number, number], c_e: number): [number, number, number]{
    return [
        (c[0] + ((c_e >> 16) & 0xff) / 0xff) / 2,
        (c[1] + ((c_e >>  8) & 0xff) / 0xff) / 2,
        (c[2] + ((c_e >>  0) & 0xff) / 0xff) / 2,
    ];
}

/** 
 * Mix colors, 2 at a time, as floats. Cauldrons do this in BE.
 * @param cs raw color values
 **/
function mix_be(...cs: number[]){
    let r = ((cs[0] >> 16) & 0xff) / 0xff;
    let g = ((cs[0] >>  8) & 0xff) / 0xff;
    let b = ((cs[0] >>  0) & 0xff) / 0xff;
    for(let i = 1; i < cs.length; i++){
        r = (r + ((cs[i] >> 16) & 0xff) / 0xff) / 2;
        g = (g + ((cs[i] >>  8) & 0xff) / 0xff) / 2;
        b = (b + ((cs[i] >>  0) & 0xff) / 0xff) / 2;
    }
    return (
        (Math.floor(r * 0xff) << 16) |
        (Math.floor(g * 0xff) <<  8) |
        (Math.floor(b * 0xff) <<  0)
    );
}

/* == Primary data structures == */

const NO_ENTRY = 0xffffffff;

class EntriesJE{
  found0: number;
  found1: Uint32Array<ArrayBuffer>;
  found2: Uint16Array<ArrayBuffer>;
  found3: Uint8Array<ArrayBuffer>;
  found: Uint32Array<ArrayBuffer>;
  checked: Uint32Array<ArrayBuffer>;
  to_check: Uint32Array<ArrayBuffer>;
  craftc: Uint8Array<ArrayBuffer>;
  dyec: Uint8Array<ArrayBuffer>;
  dyemax: Uint8Array<ArrayBuffer>;
  dyes: Uint32Array<ArrayBuffer>;
  color: Uint32Array<ArrayBuffer>;
  mixc: Uint32Array<ArrayBuffer>;
  /**
  Each of the UintArrays here represents the data for the least_craftc, least_dyec, least_dyelast, and least_dyemax sections of each color entry.
  
  Uses `(4 + 64 * 4 + 64*64 * 2 + 64*64*64 + 64*64*64*64/32 * 4 + 64*64*64*64/32 * 4 + 64*64*64*64/32 * 4) + 4*64*64*64*64 + 4*64*64*64*64 + 4*64*64*64*64 + 4*64*64*64*64 * 16*4/32 * 4 + 4*64*64*64*64 * 4 + 64*64*64*64 * 4` = ? = ? bytes.
  */
  constructor(){
    /** The number of colors in       **the dataset** which have recipes found for them. */
    this.found0   = 0;
    /** The number of colors in each **supersection** which have recipes found for them. */
    this.found1   = new Uint32Array(64);
    /** The number of colors in each      **section** which have recipes found for them. */
    this.found2   = new Uint16Array(64*64);
    /** The number of colors in each   **subsection** which have recipes found for them. */
    this.found3   = new Uint8Array (64*64*64);
    /** Whether the color has been found. */
    this.found    = new Uint32Array(64*64*64*64/32);
    /** Whether all recipes starting from the color have been checked. */
    this.checked  = new Uint32Array(64*64*64*64/32);
    /** Whether the color needs to be checked for the next search cycle. */
    this.to_check = new Uint32Array(64*64*64*64/32);
    /** The total number of crafting cycles used to make the color. */
    this.craftc   = new Uint8Array (4*64*64*64*64);
    /** The total number of dyes used to make the color. */
    this.dyec     = new Uint8Array (4*64*64*64*64);
    /** The maximum number of dyes used in any crafting step to make the color. */
    this.dyemax   = new Uint8Array (4*64*64*64*64);
    /** Array of the indices of the dyes used in this craft. First value is the length of the array. Max length is 15. */
    this.dyes     = new Uint32Array(4*64*64*64*64 * 16*4/32);
    /** The parent color. i.e. the color the armor needs to have before this craft. */
    this.color    = new Uint32Array(4*64*64*64*64);
    /** The number of times the color has been mixed before (as a parent color). */
    this.mixc     = new Uint32Array(64*64*64*64);
    
    this.craftc.fill(0xff);
    this.dyec.fill(0xff);
    this.dyemax.fill(0xff);
    this.color.fill(0xffffffff);
  }
  /** returns Uint32 (0~262143); */
  g_found1(i1: number){
    return this.found1[i1];
  }
  /** returns Uint16 (0~4095); */
  g_found2(i1: number, i2: number){
    return this.found2[i1*64 + i2];
  }
  /** returns Uint8 (0~63); */
  g_found3(i1: number, i2: number, i3: number){
    return this.found3[i1*64*64 + i2*64 + i3];
  }
  /* For each of these, j is 0~3, the type of recipe to reach data for. i is the color to read data for. */
  /** returns Boolean; */
  g_found(i: number){
    return ((this.found[i >>> 5] >>> (0x20 - (i & 0x1f))) & 1);
  }
  /** returns Boolean; */
  g_checked(i: number){
    return ((this.checked[i >>> 5] >>> (0x20 - (i & 0x1f))) & 1);
  }
  /** returns Boolean; */
  g_to_check(i: number){
    return ((this.to_check[i >>> 5] >>> (0x20 - (i & 0x1f))) & 1);
  }
  /** returns Uint8; */
  g_craftc(i: number, j: number){
    return (this.craftc[i*4 + j]);
  }
  /** returns Uint8; */
  g_dyec(i: number, j: number){
    return (this.dyec[i*4 + j]);
  }
  /** returns Uint8; */
  g_dyemax(i: number, j: number){
    return (this.dyemax[i*4 + j]);
  }
  /** returns Uint4 (Nibble); */
  g_dyes_len(i: number, j: number){
    return ((this.dyes[(i*4 + j)*2] >>> 28) & 0xf);
  }
  /** returns Uint4[] (Nibble[]); max length is 15; */
  g_dyes(i: number, j: number){
    return ((new Array((this.dyes[(i*4 + j)*2] >>> 28) & 0xf)).fill(0).map(
      (v,ii)=>
      ((this.dyes[(i*4 + j)*2 + +(ii>6)] >>> (28-4*((ii+1)%8))) & 0xf)
    ));
  }
  /** returns Uint32; 0xffffffff means no color; */
  g_color(i: number, j: number){
    return (this.color[i*4 + j]);
  }
  /** returns Uint32; */
  g_mixc(i: number){
    return (this.mixc[i]);
  }
  /** sets Uint32 (0~262143); */
  s_found1(i1: number, v: number){
    this.found1[i1] = v;
  }
  /** sets Uint16 (0~4095); */
  s_found2(i1: number, i2: number, v: number){
    this.found2[i1*64 + i2] = v;
  }
  /** sets Uint8 (0~63); */
  s_found3(i1: number, i2: number, i3: number, v: number){
    this.found3[i1*64*64 + i2*64 + i3] = v;
  }
  /* For each of these, j is 0~3, the type of recipe to reach data for. i is the color to read data for. */
  /** sets Boolean; */
  s_found(i: number, v: number){
    // bit masking!
    if(v) this.found[i >>> 5] |=  (1 << (0x20 - (i & 0x1f)));
    else  this.found[i >>> 5] &= ~(1 << (0x20 - (i & 0x1f)));
  }
  /** sets Boolean; */
  s_checked(i: number, v: number){
    // bit masking!
    if(v) this.checked[i >>> 5] |=  (1 << (0x20 - (i & 0x1f)));
    else  this.checked[i >>> 5] &= ~(1 << (0x20 - (i & 0x1f)));
  }
  /** sets Boolean; */
  s_to_check(i: number, v: number){
    // bit masking!
    if(v) this.to_check[i >>> 5] |=  (1 << (0x20 - (i & 0x1f)));
    else  this.to_check[i >>> 5] &= ~(1 << (0x20 - (i & 0x1f)));
  }
  /** sets Uint8; */
  s_craftc(i: number, j: number, v: number){
    this.craftc[i*4 + j] = v;
  }
  /** sets Uint8; */
  s_dyec(i: number, j: number, v: number){
    this.dyec[i*4 + j] = v;
  }
  /** sets Uint8; */
  s_dyemax(i: number, j: number, v: number){
    this.dyemax[i*4 + j] = v;
  }
  /** sets Uint4 (Nibble); */
  s_dyes_len(i: number, j: number, v: number){
    // more bitmasking;
    // delete the left nibble;
    this.dyes[(i*4 + j)*2] &= 0x0fffffff;
    // then set it to v;
    this.dyes[(i*4 + j)*2] |= (v & 0xf) << 28;
  }
  /** sets Uint4[] (Nibble[]); max length is 15; v should be an ACTUAL array; */
  s_dyes(i: number, j: number, v: number[]){
    // just set it directly
    this.dyes[(i*4 + j)*2] = (
      ((v.length) << 28) |
      ((v[ 0])    << 24) |
      ((v[ 1])    << 20) |
      ((v[ 2])    << 16) |
      ((v[ 3])    << 12) |
      ((v[ 4])    <<  8) |
      ((v[ 5])    <<  4) |
      ((v[ 6])         )
    );
    this.dyes[(i*4 + j)*2+1] = (
      ((v[ 7])    << 28) |
      ((v[ 8])    << 24) |
      ((v[ 9])    << 20) |
      ((v[10])    << 16) |
      ((v[11])    << 12) |
      ((v[12])    <<  8) |
      ((v[13])    <<  4) |
      ((v[14])         )
    );
  }
  /** sets Uint32; 0xffffffff means no color; */
  s_color(i: number, j: number, v: number){
    this.color[i*4 + j] = v;
  }
  /** sets Uint32; */
  s_mixc(i: number, v: number){
    this.mixc[i] = v;
  }
  at(c: number){
    return ({
      least_craftc: {
        craftc: this.g_craftc(c, 0),
        dyec:   this.g_dyec  (c, 0),
        dyemax: this.g_dyemax(c, 0),
        dyes:   this.g_dyes  (c, 0),
        color:  this.g_color (c, 0),
      },
      least_dyec: {
        craftc: this.g_craftc(c, 1),
        dyec:   this.g_dyec  (c, 1),
        dyemax: this.g_dyemax(c, 1),
        dyes:   this.g_dyes  (c, 1),
        color:  this.g_color (c, 1),
      },
      least_dyelast: {
        craftc: this.g_craftc(c, 2),
        dyec:   this.g_dyec  (c, 2),
        dyemax: this.g_dyemax(c, 2),
        dyes:   this.g_dyes  (c, 2),
        color:  this.g_color (c, 2),
      },
      least_dyemax: {
        craftc: this.g_craftc(c, 3),
        dyec:   this.g_dyec  (c, 3),
        dyemax: this.g_dyemax(c, 3),
        dyes:   this.g_dyes  (c, 3),
        color:  this.g_color (c, 3),
      },
      found: this.g_found(c),
    });
  }
  /* i will not be writing a complex setter, nor will i be using this.at; */
  /** Add a color (track it in all found levels). */
  add(c: number){
    // some bits are not used by these, because the are covered by this.found;
    const i1 = (((c >>> 22) & 3) << 4) | (((c >>> 14) & 3) << 2) | (((c >>>  6) & 3) << 0);
    const i2 = (((c >>> 20) & 3) << 4) | (((c >>> 12) & 3) << 2) | (((c >>>  4) & 3) << 0);
    const i3 = (((c >>> 18) & 3) << 4) | (((c >>> 10) & 3) << 2) | (((c >>>  2) & 3) << 0);
    
    this.found0++;
    this.s_found1(i1, this.g_found1(i1) + 1);
    this.s_found2(i1, i2, this.g_found2(i1, i2) + 1);
    this.s_found3(i1, i2, i3, this.g_found3(i1, i2, i3) + 1);
    this.s_found(c, 1);
  }
  /** Get a list of found colors, in a subsection, section, supersection, or the whole dataset. */
  to_r(...i: number[]){
    const r = [];
    
    const sx = (
      i.length === 1 ?
      (((i[0] >> 4) & 3) << 6)
      :
      i.length === 2 ?
      (((i[0] >> 4) & 3) << 6) |
      (((i[1] >> 4) & 3) << 4)
      :
      i.length === 3 ?
      (((i[0] >> 4) & 3) << 6) |
      (((i[1] >> 4) & 3) << 4) |
      (((i[2] >> 4) & 3) << 2)
      :
      0
    );
    const sy = (
      i.length === 1 ?
      (((i[0] >> 2) & 3) << 6)
      :
      i.length === 2 ?
      (((i[0] >> 2) & 3) << 6) |
      (((i[1] >> 2) & 3) << 4)
      :
      i.length === 3 ?
      (((i[0] >> 2) & 3) << 6) |
      (((i[1] >> 2) & 3) << 4) |
      (((i[2] >> 2) & 3) << 2)
      :
      0
    );
    const sz = (
      i.length === 1 ?
      (((i[0]     ) & 3) << 6)
      :
      i.length === 2 ?
      (((i[0]     ) & 3) << 6) |
      (((i[1]     ) & 3) << 4)
      :
      i.length === 3 ?
      (((i[0]     ) & 3) << 6) |
      (((i[1]     ) & 3) << 4) |
      (((i[2]     ) & 3) << 2)
      :
      0
    );
    const ex = (
      i.length === 1 ?
      (
        (((i[0] >> 4) & 3) << 6)
      ) + 64
      :
      i.length === 2 ?
      (
        (((i[0] >> 4) & 3) << 6) |
        (((i[1] >> 4) & 3) << 4)
      ) + 16
      :
      i.length === 3 ?
      (
        (((i[0] >> 4) & 3) << 6) |
        (((i[1] >> 4) & 3) << 4) |
        (((i[2] >> 4) & 3) << 2)
      ) + 4
      :
      256
    );
    const ey = (
      i.length === 1 ?
      (
        (((i[0] >> 2) & 3) << 6)
      ) + 64
      :
      i.length === 2 ?
      (
        (((i[0] >> 2) & 3) << 6) |
        (((i[1] >> 2) & 3) << 4)
      ) + 16
      :
      i.length === 3 ?
      (
        (((i[0] >> 2) & 3) << 6) |
        (((i[1] >> 2) & 3) << 4) |
        (((i[2] >> 2) & 3) << 2)
      ) + 4
      :
      256
    );
    const ez = (
      i.length === 1 ?
      (
        (((i[0]     ) & 3) << 6)
      ) + 64
      :
      i.length === 2 ?
      (
        (((i[0]     ) & 3) << 6) |
        (((i[1]     ) & 3) << 4)
      ) + 16
      :
      i.length === 3 ?
      (
        (((i[0]     ) & 3) << 6) |
        (((i[1]     ) & 3) << 4) |
        (((i[2]     ) & 3) << 2)
      ) + 4
      :
      256
    );
    console.log({sx,sy,sz,ex,ey,ez});
    
    for(
      let ix = sx, iy = sy, iz = sz;
      ix < ex;
      iz++, iz === ez && (iz = sz, iy++, iy === ey && (iy = sy, ix++))
    ){
      const ii = (ix << 16) | (iy << 8) | iz;
      if(this.g_found(ii)) r.push(ii);
    }
    return r;
  }
  /** resets this.checked to all false (i.e. all 0s); */
  reset_checked(){
    this.checked = new Uint32Array(64*64*64*64/32);
  }
  /** merges this.to_check into this.checked; */
  check_in(){
    this.to_check.forEach((v,i) => (
      this.checked[i] = v
    ));
    this.to_check = new Uint32Array(64*64*64*64/32);
  }
  /** gets all four of the optimal recipes for a given color; */
  g_recipe(i: number){
    if(!((this.found[i >>> 5] >>> (0x20 - (i & 0x1f))) & 1)) return {
      least_craftc:  [[]],
      least_dyec:    [[]],
      least_dyelast: [[]],
      least_dyemax:  [[]],
    };
    const recipe = [];
    for(let j = 0; j < 4; j++){
      const r = [];
      do{
        const l = (this.dyes[(i*4 + j)*2] >>> 28) & 0xf;
        const rr = [];
        for(let ii = 0; ii < l; ii++) rr.push(
          (this.dyes[(i*4 + j)*2 + +(ii>6)] >>> (28-4*((ii+1)%8))) & 0xf
        );
        r.push(rr);
      } while(this.color[i*4 + j] !== NO_ENTRY);
      recipe.push(r);
    }
    return {
      least_craftc:  recipe[0],
      least_dyec:    recipe[1],
      least_dyelast: recipe[2],
      least_dyemax:  recipe[3],
    };
  }
}

class EntriesBE extends Array<number[] | undefined>{
    found: number = 0;
}

/* == Search == */

// i should note that the variables in this script are named pretty poorly;
class MixU_BE{
  entries: EntriesBE;
  max_dyes: number = 6;
  constructor(entries: EntriesBE){
    this.entries = entries;
  }
  // adds a new color, made with the dyes with indices i;
  update(i: number[]){
      const c = mix_be(...(i.map(ii => c_be[ii])));
      if(!this.entries[c]){
          this.entries.found++;
          this.entries[c] = i.slice();
      }
  }
  // adds a new color, whose float representation is c_f, made with the dyes with indices c_i; if the color already exists, it will replace the existing indices, if c_i is shorter;
  add(c_f: [number, number, number], c_i: number[]){
      const c = (
          (((c_f[0] * 0xff) & 0xff) << 16) |
          (((c_f[1] * 0xff) & 0xff) <<  8) |
          (((c_f[2] * 0xff) & 0xff) <<  0)
      );
      if(!this.entries[c]){
          this.entries.found++;
      }
      if(!(this.entries[c] && this.entries[c].length <= c_i.length)){
          this.entries[c] = c_i;
      }
  }
};

const mix_per_yield = 1_000_000;

function search_be_step(mix_u: MixU_BE){
  const n = c_be.length;
  let mix_this_yield = 0;
  let step = 0;
  // normal brute force
  for(let k = 1; k <= mix_u.max_dyes; k++){
    const using = [];
    for(let i = 0; i < k; i++){
      using[i] = 0;
    }
    
    while(using[0] < n){
      mix_u.update(using);
      
      // take a break every now and then;
      mix_this_yield++;
      if(mix_this_yield >= mix_per_yield){
        mix_this_yield = 0;
        step++;
      }
      
      // the rest of this is just carrying; but apparently i'm STOOPID and can't do that right! idk how this troubled me for even a moment;
      let j = k - 1;
      using[j]++;
      while(j > 0 && using[j] === n){
        using[j] = 0;
        j--;
        using[j]++;
      }
    }
  }
}

function distance(c1: number, c2: number){
  return Math.hypot(
    (((c1 >>  0) & 0xff) - ((c2 >>  0) & 0xff)),
    (((c1 >>  8) & 0xff) - ((c2 >>  8) & 0xff)),
    (((c1 >> 16) & 0xff) - ((c2 >> 16) & 0xff))
  );
}

function to_wall(p0: [number, number, number], p1: [number, number, number]): [number, number, number]{
  /**
  Finds where a ray starting INSIDE the 0-255 bounding box hits a wall.
  p0: starting point (x0, y0, z0)
  p1: point the ray travels towards (x1, y1, z1)
  */
  const [x0, y0, z0] = p0;
  const [x1, y1, z1] = p1;
  
  // Direction vector d = p1 - p0
  let [dx, dy, dz] = [x1 - x0, y1 - y0, z1 - z0];
  
  // Initialize t_min to infinity; this will hold the smallest positive t value
  let t_min = Infinity;
  
  if(dx > 0)
    t_min = Math.min(t_min, (255 - x0) / dx);
  else if(dx < 0)
    t_min = Math.min(t_min, (0 - x0) / dx);
  
  if(dy > 0)
    t_min = Math.min(t_min, (255 - y0) / dy);
  else if(dy < 0)
    t_min = Math.min(t_min, (0 - y0) / dy);
  
  if(dz > 0)
    t_min = Math.min(t_min, (255 - z0) / dz);
  else if(dz < 0)
    t_min = Math.min(t_min, (0 - z0) / dz);
  
  // make it only go twice the distance if that fits within the walls;
  t_min = Math.min(t_min, 2);
  
  const hit_x = x0 + t_min * dx;
  const hit_y = y0 + t_min * dy;
  const hit_z = z0 + t_min * dz;
  
  return [hit_x, hit_y, hit_z];
}

// this controls the recursive branching in one_search_sub;
const splits = [
  3, 3, 3, 2, 1,
  1, 1, 1, 1, 1,
];

// sort the dyes by how close they are to w;
function near(c: [number, number, number]): [number, number, number]{
  const c_b = (
    (Math.floor(c[0] * 0xff) << 16) |
    (Math.floor(c[1] * 0xff) <<  8) |
    (Math.floor(c[2] * 0xff) <<  0)
  );
  const c_e = c_be.map((v, i) => [i, distance(v, c_b)]);
  c_e.sort((a, b) => a[1] - b[1]);
  const [c_e1, c_e2, c_e3] = c_e.map(v => v[0]);
  return [c_e1, c_e2, c_e3];
}

// start at c, look for b; recursive;
function search_be_one_sub(mix_u: MixU_BE, b: [number, number, number], c: [number, number, number], c_i: number[], i: number){
  // recursive base case;
  if(i >= splits.length) return;
  
  const w = to_wall(c, b);
  const ns = near(w).slice(0, splits[i]);
  for(const n of ns){
    // add the color index from near;
    const n_i = c_i.slice();
    n_i.push(n);
    // and make the new color;
    const n_c = mix_be_step(c, c_be[n]);
    // and update recipes!
    mix_u.add(n_c, n_i);
    // recurse!
    search_be_one_sub(
      mix_u,
      b,
      n_c,
      n_i,
      i + 1,
    );
  }
}

function search_be_one(mix_u: MixU_BE, b: number){
  // b is the color to find a recipe for;
  // first, search for a recipe for b;
  for(let i = 0; i < c_be.length; i++){
    const c = c_be[i];
    const br = ((b >> 16) & 0xff) / 0xff;
    const bg = ((b >>  8) & 0xff) / 0xff;
    const bb = ((b >>  0) & 0xff) / 0xff;
    const cr = ((c >> 16) & 0xff) / 0xff;
    const cg = ((c >>  8) & 0xff) / 0xff;
    const cb = ((c >>  0) & 0xff) / 0xff;
    search_be_one_sub(
      mix_u,
      [br, bg, bb], // just the goal color;
      [cr, cg, cb], // just the output color;
      [i], // which dyes make the output color;
      0, // index of the recursive step;
    );
  }
}

function search_be_filler(mix_u: MixU_BE){
  for(let i = 0; i < 2**24; i++){
    search_be_one(mix_u, i);
  }
}

function search_be(){
  const mix_u = new MixU_BE(new EntriesBE(2**24).fill(undefined));
  search_be_step(mix_u);
  search_be_filler(mix_u);
  return mix_u.entries;
}

/** Mixes a color and then adds its recipe if it is appropriate. */
class MixU_JE{
  // configurable values;
  c_e: number[];
  craftc_limit: number;
  dyec_limit: number;
  dyelast_limit: number;
  dyemax_limit: number;
  disallowed_dyes?: number[];
  // the queue of which colors to process next;
  ba: (number | undefined)[];
  // the current color;
  b: number;
  craftc_b: number;
  dyec_b: number;
  dyemax_b: number;
  dyelast_b: number;
  // all color recipes;
  entries: EntriesJE;
  /* config is required. */
  constructor(config: {
    c_e: number[],
    craftc_limit?: number,
    dyec_limit?: number,
    dyelast_limit?: number,
    dyemax_limit?: number,
  }){
    this.c_e = config.c_e;
    this.craftc_limit  = config.craftc_limit  ?? Infinity;
    this.dyec_limit    = config.dyec_limit    ?? Infinity;
    this.dyelast_limit = config.dyelast_limit ?? Infinity;
    this.dyemax_limit  = config.dyemax_limit  ?? Infinity;
    this.ba = [undefined /*no starting color*/];
    this.disallowed_dyes = [/*all allowed*/];
    this.entries = new EntriesJE();
    // appease TypeScript;
    this.b = 0;
    this.craftc_b = 0;
    this.dyec_b = 0;
    this.dyemax_b = 0;
    this.dyelast_b = 0;
  }
  update(i: number[]){
    // undefined and NO_ENTRY are semantically the same here;
    const b = (this.b === undefined) ? NO_ENTRY : this.b;
    
    // the color generated by the recipe;
    const c = (
      b === NO_ENTRY ? 
      mix_je(...(i.map(v => this.c_e[v]))) :
      mix_je(b, ...(i.map(v => this.c_e[v])))
    );
    const found = this.entries.g_found(c);
    if(!found){
      this.entries.add(c);
    };
    
    // add c to ba, which is the list of colors to use as "b" in the next search cycle;
    // we add it regardless of whether it's been there before, because mix_u.init prevents searching duplicates;
    this.ba.push(c);
    
    // var land!
    // vars for least_craftc;
    const craftc_c  = this.entries.g_craftc(c, 0);
    const craftc_e  = this.craftc_b + 1;
    const craftc_lt = craftc_e < craftc_c;
    const craftc_eq = craftc_e === craftc_c;
    // vars for least_dyec;
    const dyec_c  = this.entries.g_dyec(c, 1);
    const dyec_e  = this.dyec_b + i.length;
    const dyec_lt = dyec_e < dyec_c;
    const dyec_eq = dyec_e === dyec_c;
    // vars for least_dyelast;
    const dyelast_c  = this.entries.g_dyes_len(c, 2) || 0x10; // || 0x10 because if it's zero then it's undefined; and then i want to override it no matter what;
    const dyelast_lt = this.dyelast_b < dyelast_c;
    const dyelast_eq = this.dyelast_b === dyelast_c;
    // vars for least_dyemax;
    const dyemax_c  = this.entries.g_dyemax(c, 3);
    const dyemax_e = Math.max(this.dyemax_b, found ? dyemax_c : 0);
    const dyemax_lt = dyemax_e < dyemax_c;
    // unused: const dyemax_eq = dyemax_b === dyemax_c;
    
    // update based on vars;
    // essentially, sort by craftc, then dyec, then dyelast, then dyemax;
    // keep old recipe if all values tie;
    // update least_craftc;
    if(
      craftc_lt ||
      (craftc_eq && (dyec_lt || dyelast_lt || dyemax_lt))
    ){
      this.entries.s_craftc(c, 0, craftc_e);
      this.entries.s_dyec  (c, 0,   dyec_e);
      this.entries.s_dyemax(c, 0, dyemax_e);
      this.entries.s_dyes  (c, 0,        i);
    }
    // update least_dyec;
    if(
      dyec_lt ||
      (dyec_eq && (dyelast_lt || dyemax_lt))
    ){
      this.entries.s_craftc(c, 1, craftc_e);
      this.entries.s_dyec  (c, 1,   dyec_e);
      this.entries.s_dyemax(c, 1, dyemax_e);
      this.entries.s_dyes  (c, 1,        i);
    }
    // update least_dyelast;
    if(
      dyelast_lt ||
      (dyelast_eq && (dyemax_lt))
    ){
      this.entries.s_craftc(c, 2, craftc_e);
      this.entries.s_dyec  (c, 2,   dyec_e);
      this.entries.s_dyemax(c, 2, dyemax_e);
      this.entries.s_dyes  (c, 2,        i);
    }
    // update least_dyemax;
    if(
      dyemax_lt
    ){
      this.entries.s_craftc(c, 3, craftc_e);
      this.entries.s_dyec  (c, 3,   dyec_e);
      this.entries.s_dyemax(c, 3, dyemax_e);
      this.entries.s_dyes  (c, 3,        i);
    }
  }
  /* n = i.length; */
  init(b: number, n: number){
    if(b === undefined || b === NO_ENTRY){
      this.b = NO_ENTRY;
      this.craftc_b  = 1;
      this.dyec_b    = n;
      this.dyelast_b = n;
      this.dyemax_b  = n;
      return true;
    }
    this.b = b;
    // check to see if we've searched from b before;
    // yes, this will get evaluated multiple times if b does not meet the requirements the first time;
    // this is intended to make sure we check all possibilities within the restraints;
    // it doesn't use much compute, so don't stress it;
    if(this.entries.g_checked(b)) return false;
    // now if we haven't, then let's see if we '''should''';
    this.craftc_b  = this.entries.g_craftc(b, 0) + 1;
    this.dyec_b    = this.entries.g_dyec(b, 1) + n;
    this.dyelast_b = n;
    this.dyemax_b  = Math.max(this.entries.g_dyemax(b, 3), n);
    const we_should_search_from_b = !(
      this.craftc_b  >= this.craftc_limit  ||
      this.dyec_b    >= this.dyec_limit    ||
      this.dyelast_b >  this.dyelast_limit ||
      this.dyemax_b  >  this.dyemax_limit
    );
    // if we should, then make sure to "check" it off, so we won't search it twice later;
    if(we_should_search_from_b) this.entries.s_to_check(b, 1);
    // now just return that, so we can avoid running that crazy loop in subsearch over and over;
    return we_should_search_from_b;
  }
}

/* much of this basically iterates over the combinations with repetition; if you want me to rewrite it do so, contact me; */
function search_je_sub(mix_u_je: MixU_JE){
  // mix_u is life; read config from mix_u;
  const max_dye_per = mix_u_je.dyemax_limit ?? 0;
  const ba = mix_u_je.ba;
  const disallowed_dyes = mix_u_je.disallowed_dyes ?? [];
  // reset ba so mix_u can fill it;
  mix_u_je.ba = [];
  
  // main loop;
  for(const b_u of ba){
    const b = b_u ?? NO_ENTRY;
    const L = mix_u_je.c_e.length;
    
    for(let dye_per = 1; dye_per <= max_dye_per; dye_per++){
      // check to see if we should search from here;
      // this also does some other maintenance things;
      if(!mix_u_je.init(b, dye_per)){
        continue;
      }
      
      // this is the list of indices of which dyes to combine with b;
      const i = Array(dye_per).fill(0);
      // this is the "crazy loop";
      while(i[0] < L){
        mix_u_je.update(i);
        
        // the increment code from the old search;
        let again = true;
        // increment;
        let j = dye_per - 1;
        while(again){
          i[j]++;
          if(i[j] >= L) again = false;
          else again = Boolean(disallowed_dyes[i[j]]);
        }
        again = true;
        // and carry
        while(j > 0 && i[j] >= L){
          j--;
          while(again){
            i[j]++;
            if(i[j] >= L) again = false;
            else again = Boolean(disallowed_dyes[i[j]]);
          }
          again = true;
        }
        while(j < dye_per - 1){
          i[j + 1] = i[j];
          j++;
        }
      }
    }
  }
}

function search_je(){
  const mix_u = new MixU_JE({c_e: c_je});
  mix_u.ba = [undefined /*no starting color*/];
  mix_u.dyemax_limit = 8;
  mix_u.dyec_limit = 16;
  mix_u.craftc_limit = 4;
  
  while(mix_u.ba.length){
    search_je_sub(mix_u);
    mix_u.entries.check_in();
  }
  mix_u.entries.reset_checked();
  
  // search for recipes that only use 1 to 2 dyes per craft, and up to 6 crafting steps;
  mix_u.ba = [undefined /*no starting color*/];
  mix_u.dyemax_limit = 4;
  mix_u.dyec_limit = 18;
  mix_u.craftc_limit = 6;
  
  while(mix_u.ba.length){
    search_je_sub(mix_u);
    mix_u.entries.check_in();
  }
  return mix_u.entries;
}

// huge, but uses TypedArrays so it's not too bad;
export const entries_je = search_je();
// smaller and uses normal Arrays so we can store variable-length recipes;
export const entries_be = search_be();

export const imgNames = {
  white: 'White',
  lightGray: 'Light_Gray',
  gray: 'Gray',
  black: 'Black',
  brown: 'Brown',
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  lime: 'Lime',
  green: 'Green',
  cyan: 'Cyan',
  lightBlue: 'Light_Blue',
  blue: 'Blue',
  purple: 'Purple',
  magenta: 'Magenta',
  pink: 'Pink',
} as Record<Color, string>

export function colorStringToRgb(color: string): [number, number, number] {
  const hex = color.slice(1)
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return [r, g, b]
}

export type Color =
| 'white'
| 'lightGray'
| 'gray'
| 'black'
| 'brown'
| 'red'
| 'orange'
| 'yellow'
| 'lime'
| 'green'
| 'cyan'
| 'lightBlue'
| 'blue'
| 'purple'
| 'magenta'
| 'pink'

export const colorIndexMap = [
  'white',
  'lightGray',
  'gray',
  'black',
  'brown',
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'cyan',
  'lightBlue',
  'blue',
  'purple',
  'magenta',
  'pink',
] as const

export function floatRgbToInteger(rgb: [number, number, number]) {
  return rgb.map((v) => Math.floor(v * 255)) as [number, number, number]
}

export function integerRgbToFloat(rgb: [number, number, number]): [number, number, number] {
  return rgb.map((v) => Number.parseFloat((v / 255.0).toFixed(2))) as [number, number, number]
}

export function combineRgb(rgb: [number, number, number]): number {
  return ((rgb[0] & 0xff) << 16) | ((rgb[1] & 0xff) << 8) | ((rgb[2] & 0xff) << 0)
}

export function separateRgb(rgb: number): [number, number, number] {
  return [(rgb & 0xff0000) >> 16, (rgb & 0x00ff00) >> 8, (rgb & 0x0000ff) >> 0]
}

export function rgb2lab(rgb: number[]) {
  let r = rgb[0] / 255
  let g = rgb[1] / 255
  let b = rgb[2] / 255
  let x
  let y
  let z
  
  r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92
  g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92
  b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92
  
  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  
  x = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116
  y = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116
  z = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116
  
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

export function deltaE(labA: number[], labB: number[]) {
  const deltaL = labA[0] - labB[0]
  const deltaA = labA[1] - labB[1]
  const deltaB = labA[2] - labB[2]
  const c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2])
  const c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2])
  const deltaC = c1 - c2
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH)
  const sc = 1.0 + 0.045 * c1
  const sh = 1.0 + 0.015 * c1
  const deltaLKlsl = deltaL / 1.0
  const deltaCkcsc = deltaC / sc
  const deltaHkhsh = deltaH / sh
  const i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh
  return i < 0 ? 0 : Math.sqrt(i)
}

// look at how CLEAN this code is!
export function colorToRecipe(
  get_found: (c: number) => boolean,
  get_recipe: (c: number) => number[][],
  targetRgb: [number, number, number],
): [number[][], number, [number, number, number]] {
  const targetLab = rgb2lab(targetRgb)
  
  // now grab the recipe closest to the target;
  let found_color = NO_ENTRY
  let found_deltaE = Infinity
  
  // this searching logic was written by copilot;
  // Collect candidate colors by sampling the RGB space systematically
  // Start with all 256^3 colors and find ones with recipes, prioritized by LAB distance
  const candidates: [number, number][] = [] // [color, deltaE]
  
  // Sample RGB space in a smart way - use a coarse-to-fine approach
  // First pass: sample every N pixels to find approximate nearest regions
  const step = 16
  for(let r = 0; r < 256; r += step){
    for(let g = 0; g < 256; g += step){
      for(let b = 0; b < 256; b += step){
        const c = (r << 16) | (g << 8) | b
        if(get_found(c)){
          const lab = rgb2lab([r, g, b])
          const de = deltaE(lab, targetLab)
          candidates.push([c, de])
        }
      }
    }
  }
  
  // Second pass: fine search around the best candidate found in first pass
  if(candidates.length > 0){
    candidates.sort((a, b) => a[1] - b[1])
    const best = candidates[0]
    const best_rgb = separateRgb(best[0])
    
    // Search in a radius around the best candidate
    const radius = 8
    for(let r = Math.max(0, best_rgb[0] - radius); r < Math.min(256, best_rgb[0] + radius); r++){
      for(let g = Math.max(0, best_rgb[1] - radius); g < Math.min(256, best_rgb[1] + radius); g++){
        for(let b = Math.max(0, best_rgb[2] - radius); b < Math.min(256, best_rgb[2] + radius); b++){
          const c = (r << 16) | (g << 8) | b
          if(get_found(c)){
            const lab = rgb2lab([r, g, b])
            const de = deltaE(lab, targetLab)
            candidates.push([c, de])
          }
        }
      }
    }
  }
  
  // Remove duplicates and sort by distance
  const seen = new Set<number>()
  const unique_candidates: [number, number][] = []
  for(const [c, de] of candidates){
    if(!seen.has(c)){
      seen.add(c)
      unique_candidates.push([c, de])
    }
  }
  unique_candidates.sort((a, b) => a[1] - b[1])
  
  // Return the closest
  if(unique_candidates.length > 0){
    found_color = unique_candidates[0][0]
    found_deltaE = unique_candidates[0][1]
  }
  
  return [
    get_recipe(found_color),
    found_deltaE,
    separateRgb(found_color)
  ]
}

export function colorToRecipeBE(
  entries: EntriesBE,
  targetRgb: [number, number, number],
): [number[][], number, [number, number, number]] {
  return colorToRecipe(
    (c) => entries[c] !== undefined,
    (c) => [entries[c] ?? []],
    targetRgb,
  )
}

export function colorToRecipeJE(
  entries: EntriesJE,
  targetRgb: [number, number, number],
): [number[][], number, [number, number, number]] {
  return colorToRecipe(
    (c) => Boolean(entries.g_found(c)),
    (c) => entries.g_recipe(c).least_dyec,
    targetRgb,
  )
}


export function sequenceToColorFloatAverage(
  c: Color[],
  colorRgbMap: Record<Color, [number, number, number]>,
  round = false,
) {
  const color = colorRgbMap[c[0]].map((v) => v / 255) as [number, number, number]
  for (let i = 1; i < c.length; i++) {
    const [r, g, b] = colorRgbMap[c[i]]
    color[0] = (color[0] + r / 255) / 2
    color[1] = (color[1] + g / 255) / 2
    color[2] = (color[2] + b / 255) / 2
    if (round) {
      color[0] = Math.round(color[0])
      color[1] = Math.round(color[1])
      color[2] = Math.round(color[2])
    }
  }
  return floatRgbToInteger(color)
}

export function sequenceToColorFloatAverageRounded(
  c: Color[],
  colorRgbMap: Record<Color, [number, number, number]>,
) {
  return sequenceToColorFloatAverage(c, colorRgbMap, true)
}

