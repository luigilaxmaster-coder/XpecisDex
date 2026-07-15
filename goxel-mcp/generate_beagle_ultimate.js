import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\faunago\\animales vox";

if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Solid colors to match the pixel-art exactly
const colors = {
    tan: {r: 213, g: 147, b: 76},      // #D5934C (Base body)
    dark: {r: 96, g: 65, b: 43},       // #60412B (Ears)
    white: {r: 242, g: 238, b: 229},   // #F2EEE5 (Chest, snout, paws, tail tip)
    black: {r: 34, g: 34, b: 34},      // #222222 (Nose, eyes)
    pink: {r: 219, g: 119, b: 132},    // #db7784 (Tongue)
    glint: {r: 255, g: 255, b: 255}    // #ffffff (Eye glint)
};

const palette = [ {r:0,g:0,b:0} ];
const colorMap = {};
let idx = 1;
for (const [name, rgb] of Object.entries(colors)) {
  palette.push(rgb);
  colorMap[name] = idx++;
}

const paletteColors = Array.from({length: 256}).map(() => ({r:0, g:0, b:0, a:0}));
for(let i=1; i<palette.length; i++) {
  paletteColors[i-1] = {r: palette[i].r, g: palette[i].g, b: palette[i].b, a: 255};
}

let voxels = new Map();

function box(x, y, z, w, d, h, color) {
    if (!color) return;
    for(let i=0; i<w; i++) {
        for(let j=0; j<d; j++) {
            for(let k=0; k<h; k++) {
                voxels.set(`${x+i},${y+j},${z+k}`, colorMap[color]);
            }
        }
    }
}

const CX = 32;

// --- 1. PAWS (White) ---
box(CX - 7, 24, 0, 3, 4, 2, 'white'); // Front Right
box(CX + 4, 24, 0, 3, 4, 2, 'white'); // Front Left
box(CX - 7, 9, 0, 3, 4, 2, 'white');  // Back Right
box(CX + 4, 9, 0, 3, 4, 2, 'white');  // Back Left

// --- 2. LEGS (Tan) ---
box(CX - 7, 24, 2, 3, 3, 6, 'tan');
box(CX + 4, 24, 2, 3, 3, 6, 'tan');
box(CX - 7, 9, 2, 3, 3, 5, 'tan');
box(CX + 4, 9, 2, 3, 3, 5, 'tan');

// Thighs (Haunches)
box(CX - 8, 8, 7, 4, 5, 7, 'tan');
box(CX + 4, 8, 7, 4, 5, 7, 'tan');

// --- 3. BODY (Tan & White) ---
// Main body
box(CX - 6, 8, 8, 12, 17, 9, 'tan');
// Body rounding
box(CX - 5, 9, 17, 10, 15, 2, 'tan');
box(CX - 4, 10, 19, 8, 13, 1, 'tan');
box(CX - 5, 7, 9, 10, 1, 7, 'tan');

// Belly (White)
box(CX - 4, 10, 7, 8, 13, 2, 'white'); 

// Chest (White)
box(CX - 4, 23, 7, 8, 4, 5, 'white');
box(CX - 4, 25, 10, 8, 3, 4, 'white');
box(CX - 3, 26, 12, 6, 3, 4, 'white');

// --- 4. HEAD (Tan) ---
// Base tan head
box(CX - 6, 21, 15, 12, 9, 9, 'tan');
// Rounding top
box(CX - 5, 22, 24, 10, 7, 1, 'tan');
box(CX - 4, 23, 25, 8, 5, 1, 'tan');
// Rounding cheeks
box(CX - 7, 23, 16, 1, 6, 7, 'tan'); 
box(CX + 6, 23, 16, 1, 6, 7, 'tan'); 

// --- 5. SNOUT (White) ---
box(CX - 4, 28, 14, 8, 4, 5, 'white');
box(CX - 3, 32, 15, 6, 1, 4, 'white'); 
// White cheeks (jowls)
box(CX - 5, 29, 13, 10, 2, 3, 'white'); 

// --- 6. WHITE STRIPE ---
// Overwrites tan on the forehead
box(CX - 2, 25, 19, 4, 6, 7, 'white'); 
box(CX - 1, 24, 25, 2, 5, 2, 'white'); 

// --- 7. EYES (Black & Glint) ---
// Left Eye
box(CX - 4, 29, 18, 2, 1, 3, 'black');
voxels.set(`${CX - 4},${29},${20}`, colorMap['glint']); // Top outer glint
// Right Eye
box(CX + 2, 29, 18, 2, 1, 3, 'black');
voxels.set(`${CX + 3},${29},${20}`, colorMap['glint']); // Top outer glint

// --- 8. NOSE & TONGUE ---
box(CX - 1, 32, 18, 2, 2, 2, 'black'); // Nose
box(CX - 1, 31, 12, 2, 2, 1, 'pink');  // Tongue base
box(CX - 1, 32, 11, 2, 1, 1, 'pink');  // Tongue hanging

// --- 9. EARS (Dark) ---
// Left Ear 
box(CX - 8, 24, 14, 2, 5, 7, 'dark');
box(CX - 9, 25, 12, 1, 4, 7, 'dark'); 
box(CX - 8, 24, 11, 2, 5, 3, 'dark'); 
// Right Ear
box(CX + 6, 24, 14, 2, 5, 7, 'dark');
box(CX + 8, 25, 12, 1, 4, 7, 'dark');
box(CX + 6, 24, 11, 2, 5, 3, 'dark');

// --- 10. TAIL (Tan & White) ---
box(CX - 1, 6, 15, 2, 2, 4, 'tan');
box(CX - 1, 5, 18, 2, 2, 3, 'tan');
box(CX - 1, 4, 20, 2, 2, 3, 'tan');
box(CX - 1, 3, 22, 2, 2, 3, 'white'); // tip

// Export
let voxArr = [];
for (let [key, val] of voxels.entries()) {
    let [x, y, z] = key.split(',').map(Number);
    voxArr.push({x, y, z, i: val});
}

const voxData = {
    size: {x: 64, y: 64, z: 64},
    xyzi: {
        numVoxels: voxArr.length,
        values: voxArr
    },
    rgba: {
        values: paletteColors
    }
};

const writtenVox = writeVox(voxData);
fs.writeFileSync(path.join(OUTPUT_DIR, 'beagle_ultimate.vox'), Buffer.from(writtenVox));
console.log("Generated beagle_ultimate.vox");
