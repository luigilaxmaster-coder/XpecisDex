import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\faunago\\animales vox";

if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const colors = {
    tan: {r: 210, g: 139, b: 73},      // #d28b49 (Base body)
    dark: {r: 89, g: 60, b: 38},       // #593c26 (Ears)
    white: {r: 240, g: 235, b: 220},   // #f0ebdc (Chest, snout, paws, tail tip)
    black: {r: 26, g: 26, b: 26},      // #1a1a1a (Nose, eyes)
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

// SDF
function sdRoundBox(px, py, pz, bx, by, bz, r) {
    let qx = Math.abs(px) - bx;
    let qy = Math.abs(py) - by;
    let qz = Math.abs(pz) - bz;
    let dx = Math.max(qx, 0.0);
    let dy = Math.max(qy, 0.0);
    let dz = Math.max(qz, 0.0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0.0) - r;
}

function sdCapsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
    let paX = px - ax, paY = py - ay, paZ = pz - az;
    let baX = bx - ax, baY = by - ay, baZ = bz - az;
    let h = Math.max( 0.0, Math.min( 1.0, (paX*baX+paY*baY+paZ*baZ)/(baX*baX+baY*baY+baZ*baZ) ) );
    let dx = paX - baX*h;
    let dy = paY - baY*h;
    let dz = paZ - baZ*h;
    return Math.sqrt(dx*dx + dy*dy + dz*dz) - r;
}

let voxels = [];
for(let x=0; x<64; x++) {
    for(let y=0; y<64; y++) {
        for(let z=0; z<64; z++) {
            
            // X: Left-Right (Center 32)
            // Y: Back-Front (Front is +Y)
            // Z: Bottom-Top (Ground is 0)
            
            let color = null;

            // Parts
            let head = sdRoundBox(x - 32, y - 40, z - 34, 7.5, 7, 7, 2);
            let snout = sdRoundBox(x - 32, y - 49, z - 29.5, 4.5, 3, 3, 1.5);
            let nose = sdRoundBox(x - 32, y - 53, z - 31, 2, 1, 1, 0.5);
            let tongue = sdRoundBox(x - 32, y - 50, z - 25, 2, 2, 0.5, 0.5);
            
            let eyeL = sdRoundBox(x - 26, y - 47, z - 35, 1.5, 0.5, 2.5, 0.5);
            let eyeR = sdRoundBox(x - 38, y - 47, z - 35, 1.5, 0.5, 2.5, 0.5);

            let earL = sdCapsule(x, y, z, 21, 38, 38, 20, 39, 21, 3);
            let earR = sdCapsule(x, y, z, 43, 38, 38, 44, 39, 21, 3);
            
            let body = sdCapsule(x, y, z, 32, 18, 22, 32, 35, 25, 8);
            
            let legFL = sdCapsule(x, y, z, 25, 34, 20, 25, 34, 3, 3.5);
            let legFR = sdCapsule(x, y, z, 39, 34, 20, 39, 34, 3, 3.5);
            let legBL = sdCapsule(x, y, z, 25, 18, 20, 25, 18, 3, 3.5);
            let legBR = sdCapsule(x, y, z, 39, 18, 20, 39, 18, 3, 3.5);
            
            let tail = sdCapsule(x, y, z, 32, 14, 28, 32, 7, 45, 2.5);

            // Assignment
            if (nose <= 0) {
                color = 'black';
            } else if (tongue <= 0) {
                color = 'pink';
            } else if (eyeL <= 0) {
                if (x === 27 && y >= 47 && z === 36) color = 'glint';
                else color = 'black';
            } else if (eyeR <= 0) {
                if (x === 37 && y >= 47 && z === 36) color = 'glint';
                else color = 'black';
            } else if (snout <= 0) {
                color = 'white';
            } else if (earL <= 0 || earR <= 0) {
                color = 'dark';
            } else if (head <= 0) {
                // White stripe down the middle of head
                if (Math.abs(x - 32) < 3.5 && y > 40 && z > 34) {
                    color = 'white';
                } else if (z < 30) {
                    color = 'white'; // Lower cheeks white
                } else {
                    color = 'tan';
                }
            } else if (tail <= 0) {
                if (z > 39) color = 'white';
                else color = 'tan';
            } else if (legFL <= 0 || legFR <= 0 || legBL <= 0 || legBR <= 0) {
                if (z < 10) color = 'white'; // Paws
                else color = 'tan';
            } else if (body <= 0) {
                // White belly/chest
                if (z < 20 || (z < 26 && y > 28 && Math.abs(x - 32) < 6)) {
                    color = 'white';
                } else {
                    color = 'tan';
                }
            }

            if (color) {
                voxels.push({x, y, z, i: colorMap[color]});
            }
        }
    }
}

const voxData = {
    size: {x: 64, y: 64, z: 64},
    xyzi: {
        numVoxels: voxels.length,
        values: voxels
    },
    rgba: {
        values: paletteColors
    }
};

const writtenVox = writeVox(voxData);
fs.writeFileSync(path.join(OUTPUT_DIR, 'beagle_voxel.vox'), Buffer.from(writtenVox));
console.log("Generated beagle_voxel.vox");
