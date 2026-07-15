import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\faunago\\animales vox";

if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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

function setVoxel(x, y, z, color) {
    if (!color) return;
    voxels.set(`${x},${y},${z}`, colorMap[color]);
}

function fillBox(x, y, z, w, d, h, color) {
    for(let i=0; i<w; i++) {
        for(let j=0; j<d; j++) {
            for(let k=0; k<h; k++) {
                setVoxel(x+i, y+j, z+k, color);
            }
        }
    }
}

// Coordinate system:
// X: Left to Right (Center is 32)
// Y: Back to Front (Head is towards +Y)
// Z: Bottom to Top (Ground is 0)

const CX = 32;

// --- 1. PAWS (White) ---
// Front Paws (Width 3, Depth 4, Height 2)
fillBox(CX - 6, 26, 0, 3, 4, 2, 'white'); // Front Right (viewer's left)
fillBox(CX + 3, 26, 0, 3, 4, 2, 'white'); // Front Left (viewer's right)

// Back Paws
fillBox(CX - 6, 12, 0, 3, 4, 2, 'white');
fillBox(CX + 3, 12, 0, 3, 4, 2, 'white');

// --- 2. LEGS (Tan) ---
// Front Legs (Height 7)
fillBox(CX - 6, 27, 2, 3, 3, 7, 'tan');
fillBox(CX + 3, 27, 2, 3, 3, 7, 'tan');

// Back Legs (Height 7 + Thigh)
fillBox(CX - 6, 12, 2, 3, 4, 6, 'tan'); // lower back leg
fillBox(CX + 3, 12, 2, 3, 4, 6, 'tan'); 
// Thighs (Haunches)
fillBox(CX - 7, 11, 8, 4, 6, 7, 'tan'); 
fillBox(CX + 3, 11, 8, 4, 6, 7, 'tan');

// --- 3. BODY (Tan & White) ---
// Main Torso (Tan)
fillBox(CX - 5, 12, 9, 10, 16, 9, 'tan');
// Rounding torso top
fillBox(CX - 4, 12, 18, 8, 15, 1, 'tan');

// Underbelly & Chest (White)
fillBox(CX - 3, 14, 8, 6, 12, 2, 'white'); // belly
fillBox(CX - 4, 25, 9, 8, 4, 6, 'white'); // lower chest
fillBox(CX - 3, 27, 10, 6, 2, 7, 'white'); // upper chest fluff

// --- 4. HEAD (Tan, White, Black, Pink) ---
// Head Base (Tan)
fillBox(CX - 5, 24, 16, 10, 8, 8, 'tan');
// Head top rounding
fillBox(CX - 4, 25, 24, 8, 6, 1, 'tan');

// Snout (White) - Sticks out front
fillBox(CX - 4, 32, 15, 8, 4, 4, 'white'); // wide cheeks
fillBox(CX - 3, 32, 19, 6, 3, 1, 'white'); // top of snout

// Nose (Black)
fillBox(CX - 1.5, 35, 17, 3, 1, 2, 'black'); // Nose at front top of snout

// Tongue (Pink)
fillBox(CX - 1, 33, 14, 2, 2, 1, 'pink');
fillBox(CX - 1, 34, 13, 2, 1, 1, 'pink'); // hangs down

// White Stripe on Forehead
fillBox(CX - 1.5, 24, 19, 3, 9, 6, 'white'); 

// Eyes (Black & Glint)
// Left Eye (viewer's left)
fillBox(CX - 4, 31, 19, 2, 1, 3, 'black');
setVoxel(CX - 4, 31, 21, 'glint'); // Top outer glint

// Right Eye (viewer's right)
fillBox(CX + 2, 31, 19, 2, 1, 3, 'black');
setVoxel(CX + 3, 31, 21, 'glint'); // Top outer glint

// --- 5. EARS (Dark Brown) ---
// Floppy ears on the sides of the head
// Viewer's Left Ear
fillBox(CX - 7, 26, 15, 2, 5, 8, 'dark');
fillBox(CX - 8, 27, 12, 2, 4, 4, 'dark'); // flaps down
// Viewer's Right Ear
fillBox(CX + 5, 26, 15, 2, 5, 8, 'dark');
fillBox(CX + 6, 27, 12, 2, 4, 4, 'dark'); 

// --- 6. TAIL (Tan & White) ---
// Base angles up and back
fillBox(CX - 1, 10, 16, 2, 2, 4, 'tan');
fillBox(CX - 1, 9, 19, 2, 2, 4, 'tan');
fillBox(CX - 1, 8, 22, 2, 2, 3, 'tan');
// Tail Tip (White)
fillBox(CX - 1.5, 7, 25, 3, 3, 3, 'white');


// Format for vox-saver
let voxArr = [];
for (let [key, val] of voxels.entries()) {
    let [x, y, z] = key.split(',').map(Number);
    voxArr.push({x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), i: val});
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
fs.writeFileSync(path.join(OUTPUT_DIR, 'beagle_1to1.vox'), Buffer.from(writtenVox));
console.log("Generated beagle_1to1.vox");
