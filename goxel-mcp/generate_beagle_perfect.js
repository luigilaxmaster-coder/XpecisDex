import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\faunago\\animales vox";

if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const colors = {
    tan1: {r: 231, g: 167, b: 96}, // lightest
    tan2: {r: 213, g: 147, b: 76},
    tan3: {r: 196, g: 129, b: 61},
    tan4: {r: 178, g: 111, b: 46}, // darkest
    
    dark1: {r: 112, g: 78, b: 55},
    dark2: {r: 96, g: 65, b: 43},
    dark3: {r: 77, g: 49, b: 29},
    
    white1: {r: 255, g: 255, b: 252},
    white2: {r: 242, g: 238, b: 229},
    white3: {r: 220, g: 215, b: 205},
    
    black: {r: 34, g: 34, b: 34},
    pink: {r: 219, g: 119, b: 132},
    glint: {r: 255, g: 255, b: 255}
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

function pseudoNoise(x, y, z) {
    return (Math.sin(x*12.9898 + y*78.233 + z*37.719) * 43758.5453) % 1;
}

function getTan(x, y, z) {
    let noise = pseudoNoise(x, y, z);
    let h = z / 40;
    let score = noise * 0.5 + h;
    if (score > 0.8) return 'tan1';
    if (score > 0.5) return 'tan2';
    if (score > 0.2) return 'tan3';
    return 'tan4';
}

function getWhite(x, y, z) {
    let noise = pseudoNoise(x, y, z);
    let h = z / 30;
    let score = noise * 0.4 + h;
    if (score > 0.7) return 'white1';
    if (score > 0.3) return 'white2';
    return 'white3';
}

function getDark(x, y, z) {
    let noise = pseudoNoise(x, y, z);
    let score = noise;
    if (score > 0.6) return 'dark1';
    if (score > 0.2) return 'dark2';
    return 'dark3';
}

function setVoxel(x, y, z, mat) {
    if (!mat) return;
    let colorStr = mat;
    if (mat === 'tan') colorStr = getTan(x, y, z);
    if (mat === 'white') colorStr = getWhite(x, y, z);
    if (mat === 'dark') colorStr = getDark(x, y, z);
    
    voxels.set(`${x},${y},${z}`, colorMap[colorStr]);
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

const CX = 32;

// 1. PAWS (White)
fillBox(CX - 7, 26, 0, 4, 4, 2, 'white'); // Front Right
fillBox(CX + 4, 26, 0, 4, 4, 2, 'white'); // Front Left
fillBox(CX - 7, 10, 0, 4, 4, 2, 'white'); // Back Right
fillBox(CX + 4, 10, 0, 4, 4, 2, 'white'); // Back Left

// Add cute toes (stepping forward)
fillBox(CX - 7, 30, 0, 4, 1, 1, 'white');
fillBox(CX + 4, 30, 0, 4, 1, 1, 'white');
fillBox(CX - 7, 14, 0, 4, 1, 1, 'white');
fillBox(CX + 4, 14, 0, 4, 1, 1, 'white');

// 2. LEGS (Tan)
fillBox(CX - 6.5, 26.5, 2, 3, 3, 7, 'tan');
fillBox(CX + 4.5, 26.5, 2, 3, 3, 7, 'tan');
fillBox(CX - 6.5, 10.5, 2, 3, 3, 5, 'tan');
fillBox(CX + 4.5, 10.5, 2, 3, 3, 5, 'tan');

// Thighs (Haunches)
fillBox(CX - 8, 9, 7, 4, 6, 8, 'tan'); 
fillBox(CX + 5, 9, 7, 4, 6, 8, 'tan');

// 3. BODY
// Torso (Tan)
fillBox(CX - 6, 9, 10, 13, 18, 10, 'tan');
// Torso Rounding
fillBox(CX - 5, 9, 20, 11, 17, 2, 'tan');
fillBox(CX - 4, 10, 22, 9, 15, 1, 'tan');

// Chest/Belly (White)
fillBox(CX - 4, 11, 8, 9, 14, 3, 'white'); // belly
fillBox(CX - 5, 26, 9, 11, 4, 10, 'white'); // chest front
fillBox(CX - 4, 28, 10, 9, 2, 8, 'white'); // chest fluff

// 4. HEAD
// Base (Tan)
fillBox(CX - 7, 24, 18, 15, 10, 11, 'tan');
// Rounding top
fillBox(CX - 6, 25, 29, 13, 8, 2, 'tan');
fillBox(CX - 5, 26, 31, 11, 6, 1, 'tan');

// Snout (White)
// Extends out to Y=37
fillBox(CX - 4, 33, 17, 9, 5, 5, 'white'); 
// Snout rounding
fillBox(CX - 3, 34, 22, 7, 3, 1, 'white');
fillBox(CX - 3, 38, 17, 7, 1, 4, 'white'); // front face

// Nose (Black)
fillBox(CX - 1.5, 38, 20, 4, 2, 2, 'black');

// Tongue (Pink)
fillBox(CX - 1, 37, 15, 3, 2, 1, 'pink');
fillBox(CX - 1, 38, 14, 3, 1, 1, 'pink'); // tip

// White Stripe on Forehead
fillBox(CX - 3, 29, 21, 7, 6, 10, 'white');
fillBox(CX - 2, 27, 29, 5, 6, 2, 'white');
fillBox(CX - 1, 28, 31, 3, 5, 1, 'white');

// Eyes
// Left
fillBox(CX - 6, 32, 21, 2, 1, 3, 'black');
setVoxel(CX - 6, 32, 23, 'glint'); // Glint
// Right
fillBox(CX + 5, 32, 21, 2, 1, 3, 'black');
setVoxel(CX + 6, 32, 23, 'glint'); // Glint

// 5. EARS (Dark)
// Big and floppy
// Left Ear
fillBox(CX - 9, 25, 18, 2, 7, 10, 'dark');
fillBox(CX - 10, 26, 15, 2, 6, 8, 'dark');
fillBox(CX - 10, 26, 13, 2, 5, 2, 'dark'); // bottom tip
// Right Ear
fillBox(CX + 8, 25, 18, 2, 7, 10, 'dark');
fillBox(CX + 9, 26, 15, 2, 6, 8, 'dark');
fillBox(CX + 9, 26, 13, 2, 5, 2, 'dark'); // bottom tip

// 6. TAIL
// Base
fillBox(CX - 1.5, 8, 18, 4, 3, 5, 'tan');
// Curve up
fillBox(CX - 1.5, 7, 23, 4, 3, 4, 'tan');
fillBox(CX - 1.5, 6, 26, 4, 3, 3, 'tan');
fillBox(CX - 1.5, 5, 28, 4, 4, 3, 'tan');
// Tip (White)
fillBox(CX - 1.5, 4, 31, 4, 4, 4, 'white');
fillBox(CX - 1, 3, 35, 3, 3, 2, 'white');

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
fs.writeFileSync(path.join(OUTPUT_DIR, 'beagle_perfect.vox'), Buffer.from(writtenVox));
console.log("Generated beagle_perfect.vox");
