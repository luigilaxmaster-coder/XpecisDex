import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\faunago\\animales vox";
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Subtle, elegant palette for the premium look
const colors = {
    // Tans (soft gradient)
    t1: {r:225, g:156, b:84}, 
    t2: {r:213, g:147, b:76}, 
    t3: {r:201, g:138, b:68},
    // Whites/Creams
    w1: {r:255, g:255, b:252}, 
    w2: {r:242, g:238, b:229}, 
    w3: {r:230, g:226, b:217},
    // Dark Browns
    d1: {r:106, g:72, b:48}, 
    d2: {r:96, g:65, b:43}, 
    d3: {r:86, g:58, b:38},
    // Accents
    black: {r:34, g:34, b:34},
    pink: {r:219, g:119, b:132},
    white_pure: {r:255, g:255, b:255}
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

// --- MATH & SDF FUNCTIONS ---
function length(p) { return Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z); }

function sdRoundBox(p, b, r) {
    let qx = Math.abs(p.x) - b.x;
    let qy = Math.abs(p.y) - b.y;
    let qz = Math.abs(p.z) - b.z;
    let dx = Math.max(qx, 0);
    let dy = Math.max(qy, 0);
    let dz = Math.max(qz, 0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
}

function sdCapsule(p, a, b, r) {
    let pax = p.x - a.x, pay = p.y - a.y, paz = p.z - a.z;
    let bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
    let h = Math.max(0, Math.min(1, (pax*bax + pay*bay + paz*baz) / (bax*bax + bay*bay + baz*baz)));
    let dx = pax - bax * h;
    let dy = pay - bay * h;
    let dz = paz - baz * h;
    return Math.sqrt(dx*dx + dy*dy + dz*dz) - r;
}

function sdSphere(p, r) {
    return length(p) - r;
}

function smin(a, b, k) {
    let res = Math.exp(-k*a) + Math.exp(-k*b);
    return -Math.log(res)/k;
}

function pseudoNoise(x, y, z) {
    // High-frequency noise for subtle texturing (not wood grain)
    return Math.abs((Math.sin(x*12.9898 + y*78.233 + z*37.719) * 43758.5453) % 1);
}

function getMaterialColor(mat, x, y, z) {
    if (mat === 'white_pure' || mat === 'black' || mat === 'pink') return mat;
    
    let n = pseudoNoise(x, y, z);
    if (mat === 'tan') {
        if (n > 0.7) return 't1';
        if (n > 0.3) return 't2';
        return 't3';
    }
    if (mat === 'white') {
        if (n > 0.8) return 'w1';
        if (n > 0.4) return 'w2';
        return 'w3';
    }
    if (mat === 'dark') {
        if (n > 0.7) return 'd1';
        if (n > 0.3) return 'd2';
        return 'd3';
    }
    return 't2';
}

function opU(d1, mat1, d2, mat2) {
    return (d1 < d2) ? { d: d1, mat: mat1 } : { d: d2, mat: mat2 };
}

function opSmoothU(d1, mat1, d2, mat2, k) {
    let d = smin(d1, d2, k);
    let mat = (d1 < d2) ? mat1 : mat2;
    return { d: d, mat: mat };
}

function map(x, y, z) {
    let p = {x, y, z};
    let res = { d: 1000, mat: 'none' };

    // BODY (Tan)
    let dBody = sdCapsule(p, {x:32, y:20, z:22}, {x:32, y:42, z:22}, 11);
    
    // CHEST (White)
    let dChest = sdSphere({x: p.x, y: p.y - 48, z: p.z - 21}, 10.5);
    
    // HEAD BASE (Tan)
    let dHeadBase = sdRoundBox({x: p.x - 32, y: p.y - 47, z: p.z - 41}, {x:9, y:7, z:8}, 3);
    
    // Core Blending
    let dCore = smin(dBody, dChest, 2.0);
    dCore = smin(dCore, dHeadBase, 2.5);
    
    let coreMat = 'tan';
    if (dChest < dBody && dChest < dHeadBase) coreMat = 'white';
    
    // White Stripe on Head
    if (Math.abs(p.x - 32) < 3.5 && p.y > 44 && p.z > 37) {
        if (dHeadBase < dBody) coreMat = 'white'; 
    }
    res = { d: dCore, mat: coreMat };

    // SNOUT (White)
    let dSnout = sdRoundBox({x: p.x - 32, y: p.y - 57, z: p.z - 34}, {x:6, y:4, z:4}, 2);
    res = opSmoothU(res.d, res.mat, dSnout, 'white', 1.5);

    // NOSE (Black)
    let dNose = sdRoundBox({x: p.x - 32, y: p.y - 62.5, z: p.z - 37}, {x:2.5, y:1, z:1.5}, 0.8);
    res = opU(res.d, res.mat, dNose, 'black');
    
    // TONGUE (Pink)
    let dTongue = sdRoundBox({x: p.x - 32, y: p.y - 60, z: p.z - 30}, {x:2, y:1.5, z:1}, 0.5);
    res = opU(res.d, res.mat, dTongue, 'pink');

    // EYES (Black with glint)
    let dLeftEye = sdSphere({x: p.x - 24, y: p.y - 52.5, z: p.z - 41}, 2.5);
    let dRightEye = sdSphere({x: p.x - 40, y: p.y - 52.5, z: p.z - 41}, 2.5);
    
    let leftEyeMat = 'black';
    if (p.x < 24 && p.z > 41 && p.y > 52) leftEyeMat = 'white_pure'; // Outer top glint
    
    let rightEyeMat = 'black';
    if (p.x > 40 && p.z > 41 && p.y > 52) rightEyeMat = 'white_pure'; // Outer top glint
    
    res = opU(res.d, res.mat, dLeftEye, leftEyeMat);
    res = opU(res.d, res.mat, dRightEye, rightEyeMat);

    // EARS (Dark)
    let dLeftEar = sdRoundBox({x: p.x - 17, y: p.y - 44, z: p.z - 33}, {x: 1.5, y: 6, z: 9}, 2.5);
    let dRightEar = sdRoundBox({x: p.x - 47, y: p.y - 44, z: p.z - 33}, {x: 1.5, y: 6, z: 9}, 2.5);
    res = opSmoothU(res.d, res.mat, dLeftEar, 'dark', 1.5);
    res = opSmoothU(res.d, res.mat, dRightEar, 'dark', 1.5);

    // FRONT LEGS
    let dFLLeg = sdCapsule(p, {x:23, y:42, z:20}, {x:23, y:45, z:4}, 3.5);
    let dFRLeg = sdCapsule(p, {x:41, y:42, z:20}, {x:41, y:45, z:4}, 3.5);
    let legMatFront = (p.z < 9) ? 'white' : 'tan';
    res = opSmoothU(res.d, res.mat, dFLLeg, legMatFront, 2.0);
    res = opSmoothU(res.d, res.mat, dFRLeg, legMatFront, 2.0);

    // BACK LEGS
    let dBLLeg = sdCapsule(p, {x:23, y:22, z:20}, {x:23, y:23, z:4}, 3.5);
    let dBRLeg = sdCapsule(p, {x:41, y:22, z:20}, {x:41, y:23, z:4}, 3.5);
    let legMatBack = (p.z < 9) ? 'white' : 'tan';
    res = opSmoothU(res.d, res.mat, dBLLeg, legMatBack, 2.0);
    res = opSmoothU(res.d, res.mat, dBRLeg, legMatBack, 2.0);
    
    // HAUNCHES
    let dBLHaunch = sdSphere({x: p.x - 21, y: p.y - 20, z: p.z - 17}, 6.5);
    let dBRHaunch = sdSphere({x: p.x - 43, y: p.y - 20, z: p.z - 17}, 6.5);
    res = opSmoothU(res.d, res.mat, dBLHaunch, 'tan', 3.0);
    res = opSmoothU(res.d, res.mat, dBRHaunch, 'tan', 3.0);

    // PAWS
    let dFLPaw = sdRoundBox({x: p.x - 23, y: p.y - 47, z: p.z - 2}, {x:3.5, y:4.5, z:2}, 1.5);
    let dFRPaw = sdRoundBox({x: p.x - 41, y: p.y - 47, z: p.z - 2}, {x:3.5, y:4.5, z:2}, 1.5);
    let dBLPaw = sdRoundBox({x: p.x - 23, y: p.y - 25, z: p.z - 2}, {x:3.5, y:4.5, z:2}, 1.5);
    let dBRPaw = sdRoundBox({x: p.x - 41, y: p.y - 25, z: p.z - 2}, {x:3.5, y:4.5, z:2}, 1.5);
    
    res = opSmoothU(res.d, res.mat, dFLPaw, 'white', 1.5);
    res = opSmoothU(res.d, res.mat, dFRPaw, 'white', 1.5);
    res = opSmoothU(res.d, res.mat, dBLPaw, 'white', 1.5);
    res = opSmoothU(res.d, res.mat, dBRPaw, 'white', 1.5);

    // TAIL
    let dTail1 = sdCapsule(p, {x:32, y:12, z:24}, {x:32, y:5, z:34}, 3);
    let dTail2 = sdCapsule(p, {x:32, y:5, z:34}, {x:32, y:9, z:44}, 3);
    let dTail = smin(dTail1, dTail2, 2.5);
    let tailMat = (p.z > 37) ? 'white' : 'tan';
    res = opSmoothU(res.d, res.mat, dTail, tailMat, 2.0);

    return res;
}

// Generate the voxels
for (let x = 0; x < 64; x++) {
    for (let y = 0; y < 64; y++) {
        for (let z = 0; z < 64; z++) {
            let res = map(x, y, z);
            if (res.d <= 0.5) { // Threshold for surface
                let colorName = getMaterialColor(res.mat, x, y, z);
                voxels.set(`${x},${y},${z}`, colorMap[colorName]);
            }
        }
    }
}

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
fs.writeFileSync(path.join(OUTPUT_DIR, 'beagle_premium.vox'), Buffer.from(writtenVox));
console.log("Generated beagle_premium.vox with SDF organic modeling.");
