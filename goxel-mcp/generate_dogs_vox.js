import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\faunago\\animales vox";

if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const dogColors = {
    base: {r: 141, g: 153, b: 168},
    light: {r: 184, g: 195, b: 207},
    mid: {r: 109, g: 120, b: 136},
    shadow: {r: 75, g: 85, b: 99},
    dark: {r: 39, g: 49, b: 61},
    accent: {r: 16, g: 24, b: 32},
    eye: {r: 221, g: 235, b: 255},
    nose: {r: 16, g: 24, b: 32},
    white: {r: 244, g: 248, b: 251}
};

const palette = [ {r:0,g:0,b:0} ];
const colorMap = {};
let idx = 1;
for (const [name, rgb] of Object.entries(dogColors)) {
  palette.push(rgb);
  colorMap[name] = idx++;
}

const paletteColors = Array.from({length: 256}).map(() => ({r:0, g:0, b:0, a:0}));
for(let i=1; i<palette.length; i++) {
  paletteColors[i-1] = {r: palette[i].r, g: palette[i].g, b: palette[i].b, a: 255};
}

// SDF Primitives
function isInsideEllipsoid(x, y, z, cx, cy, cz, rx, ry, rz) {
    return Math.pow((x - cx)/rx, 2) + Math.pow((y - cy)/ry, 2) + Math.pow((z - cz)/rz, 2) <= 1;
}

function isInsideCapsule(x, y, z, pax, pay, paz, pbx, pby, pbz, r) {
    let pax_ = x - pax, pay_ = y - pay, paz_ = z - paz;
    let baX = pbx - pax, baY = pby - pay, baZ = pbz - paz;
    let dot = pax_ * baX + pay_ * baY + paz_ * baZ;
    let lenSq = baX * baX + baY * baY + baZ * baZ;
    let h = Math.max(0, Math.min(1, dot / lenSq));
    let dx = pax_ - baX * h;
    let dy = pay_ - baY * h;
    let dz = paz_ - baZ * h;
    return (dx * dx + dy * dy + dz * dz) <= r * r;
}

function generateDog(config, name) {
    let voxels = [];
    let s = 2; // scale

    let offset = {x: 16, y: 8, z: 16}; // center properly in a larger box

    for(let x = -20; x <= 30; x++) {
        for(let y = -10; y <= 20; y++) {
            for(let z = -20; z <= 20; z++) {
                
                let fx = x / s;
                let fy = y / s;
                let fz = z / s;

                let color = null;
                
                let inTorso = isInsideCapsule(fx, fy, fz, config.chest.x, config.chest.y, config.chest.z, config.hips.x, config.hips.y, config.hips.z, config.bodyR);
                let inBelly = isInsideCapsule(fx, fy, fz, config.chest.x, config.chest.y-config.bodyR*0.8, config.chest.z, config.hips.x, config.hips.y-config.bodyR*0.8, config.hips.z, config.bodyR*0.8);
                
                let inHead = isInsideEllipsoid(fx, fy, fz, config.head.x, config.head.y, config.head.z, config.head.rx, config.head.ry, config.head.rz);
                let inSnout = isInsideCapsule(fx, fy, fz, config.head.x, config.head.y, config.head.z, config.snout.x, config.snout.y, config.snout.z, config.snout.r);
                let inNose = isInsideEllipsoid(fx, fy, fz, config.snout.x+0.5, config.snout.y+0.2, config.snout.z, 0.4, 0.4, 0.4);
                
                let inEarL = isInsideCapsule(fx, fy, fz, config.head.x-0.5, config.head.y+0.5, config.head.z+config.head.rz, config.ear.x, config.ear.y, config.ear.z, config.ear.r);
                let inEarR = isInsideCapsule(fx, fy, fz, config.head.x-0.5, config.head.y+0.5, config.head.z-config.head.rz, config.ear.x, config.ear.y, -config.ear.z, config.ear.r);

                let inLegFL = isInsideCapsule(fx, fy, fz, config.chest.x, config.chest.y, config.chest.z + config.bodyR*0.8, config.chest.x, config.legY, config.chest.z + config.bodyR*0.8, config.legR);
                let inLegFR = isInsideCapsule(fx, fy, fz, config.chest.x, config.chest.y, config.chest.z - config.bodyR*0.8, config.chest.x, config.legY, config.chest.z - config.bodyR*0.8, config.legR);
                let inLegBL = isInsideCapsule(fx, fy, fz, config.hips.x, config.hips.y, config.hips.z + config.bodyR*0.8, config.hips.x, config.legY, config.hips.z + config.bodyR*0.8, config.legR);
                let inLegBR = isInsideCapsule(fx, fy, fz, config.hips.x, config.hips.y, config.hips.z - config.bodyR*0.8, config.hips.x, config.legY, config.hips.z - config.bodyR*0.8, config.legR);

                let inTail = isInsideCapsule(fx, fy, fz, config.hips.x, config.hips.y, config.hips.z, config.tail.x, config.tail.y, config.tail.z, config.tail.r);

                let inEyeL = isInsideEllipsoid(fx, fy, fz, config.head.x + config.head.rx*0.6, config.head.y + 0.3, config.head.z + config.head.rz*0.6, 0.3, 0.3, 0.3);
                let inEyeR = isInsideEllipsoid(fx, fy, fz, config.head.x + config.head.rx*0.6, config.head.y + 0.3, config.head.z - config.head.rz*0.6, 0.3, 0.3, 0.3);

                if (inEyeL || inEyeR) { color = 'eye'; }
                else if (inNose) { color = 'nose'; }
                else if (inEarL || inEarR) { color = 'dark'; }
                else if (inSnout) { color = 'light'; }
                else if (inHead) { color = 'base'; }
                else if (inLegFL || inLegBL) { color = 'dark'; }
                else if (inLegFR || inLegBR) { color = 'mid'; }
                else if (inTail) { color = 'shadow'; }
                else if (inBelly) { color = 'white'; }
                else if (inTorso) { color = 'base'; }

                if (color) {
                    // For MagicaVoxel, z is up. Our y is up, so we swap y and z for export.
                    let vx = x + offset.x;
                    let vy = z + offset.z;
                    let vz = y + offset.y;
                    
                    if (vx>=0 && vx<64 && vy>=0 && vy<64 && vz>=0 && vz<64) {
                        voxels.push({x: vx, y: vy, z: vz, i: colorMap[color]}); 
                    }
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
    fs.writeFileSync(path.join(OUTPUT_DIR, name + '.vox'), Buffer.from(writtenVox));
    console.log(`Generated ${name}.vox`);
}

generateDog({
    chest: {x: 6, y: 1.5, z: 0}, hips: {x: 1, y: 1.5, z: 0}, bodyR: 1.5,
    head: {x: 7.5, y: 3, z: 0, rx: 1.2, ry: 1.2, rz: 1}, 
    snout: {x: 9.5, y: 2.5, z: 0, r: 0.6},
    ear: {x: 6, y: 4.5, z: 1.2, r: 0.3},
    legY: 0, legR: 0.6,
    tail: {x: -2, y: 0.5, z: 0, r: 0.7}
}, 'dog_v1_realistic');

generateDog({
    chest: {x: 4, y: 1.5, z: 0}, hips: {x: 2, y: 1.5, z: 0}, bodyR: 1.5,
    head: {x: 5.5, y: 3.5, z: 0, rx: 2, ry: 2, rz: 2}, 
    snout: {x: 7.5, y: 3.2, z: 0, r: 0.8},
    ear: {x: 4, y: 5.5, z: 2, r: 0.5},
    legY: 0.5, legR: 0.7,
    tail: {x: 0, y: 2, z: 0, r: 0.6}
}, 'dog_v2_chibi');

generateDog({
    chest: {x: 6.5, y: 2, z: 0}, hips: {x: 1, y: 1.5, z: 0}, bodyR: 1.8,
    head: {x: 8.5, y: 2.5, z: 0, rx: 1.5, ry: 1.2, rz: 1.2}, 
    snout: {x: 11, y: 2.3, z: 0, r: 0.5},
    ear: {x: 7, y: 4, z: 1.5, r: 0.4},
    legY: 0, legR: 0.5,
    tail: {x: -3, y: 1, z: 0, r: 0.8}
}, 'dog_v3_direwolf');

generateDog({
    chest: {x: 4, y: 1, z: 0}, hips: {x: 1, y: 1, z: 0}, bodyR: 1.2,
    head: {x: 5.5, y: 2.5, z: 0, rx: 1.5, ry: 1.5, rz: 1.5}, 
    snout: {x: 7, y: 2.2, z: 0, r: 0.6},
    ear: {x: 4.5, y: 3.5, z: 1.5, r: 0.3},
    legY: 0, legR: 0.5,
    tail: {x: -1, y: 1.5, z: 0, r: 0.4}
}, 'dog_v4_puppy');

generateDog({
    chest: {x: 6, y: 1.5, z: 0}, hips: {x: 1, y: 1.5, z: 0}, bodyR: 1.5,
    head: {x: 7, y: 3, z: 0, rx: 1.5, ry: 1.5, rz: 1.2}, 
    snout: {x: 9, y: 2.5, z: 0, r: 0.7},
    ear: {x: 6, y: 4.5, z: 1.5, r: 0.4},
    legY: -0.5, legR: 0.5,
    tail: {x: -2, y: 2, z: 0, r: 0.5}
}, 'dog_v5_stylized');
