import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\generated\\voxels\\blue_alien_pet";

// Paleta técnica exacta solicitada por el usuario
const colors = {
  body_base_blue:        {r: 58, g: 99, b: 143},  // #3A638F
  body_mid_blue:         {r: 74, g: 115, b: 157}, // #4A739D
  body_dark_blue:        {r: 36, g: 73, b: 110},  // #24496E
  body_deep_shadow:      {r: 23, g: 52, b: 81},   // #173451
  body_highlight_blue:   {r: 110, g: 147, b: 184},// #6E93B8

  belly_light_cyan:      {r: 167, g: 215, b: 222},// #A7D7DE
  belly_mid_cyan:        {r: 134, g: 194, b: 203},// #86C2CB
  belly_shadow_cyan:     {r: 111, g: 170, b: 181},// #6FAAB5

  ear_inner_pink:        {r: 215, g: 161, b: 201},// #D7A1C9
  ear_inner_dark_pink:   {r: 190, g: 134, b: 176},// #BE86B0

  nose_muzzle_purple:    {r: 107, g: 44, b: 132}, // #6B2C84
  nose_muzzle_dark:      {r: 76, g: 30, b: 95},   // #4C1E5F

  eye_black:             {r: 7, g: 9, b: 13},     // #07090D
  eye_highlight_white:   {r: 245, g: 251, b: 255},// #F5FBFF

  collar_red:            {r: 201, g: 24, b: 36},  // #C91824
  collar_shadow_red:     {r: 153, g: 19, b: 27},  // #99131B

  claw_dark:             {r: 22, g: 40, b: 62},   // #16283E
  antenna_tip_dark:      {r: 15, g: 39, b: 64}    // #0F2740
};

// Map color names to indices (1 to 16)
const palette = [ {r:0,g:0,b:0} ]; // index 0 transparent
const colorMap = {};
let idx = 1;
for (const [name, rgb] of Object.entries(colors)) {
  palette.push(rgb);
  colorMap[name] = idx++;
}

const size = {x: 96, y: 96, z: 96};
const grid = new Map();

function setVoxel(x, y, z, c) {
  x = Math.round(x);
  y = Math.round(y);
  z = Math.round(z);
  if(x>=0 && x<size.x && y>=0 && y<size.y && z>=0 && z<size.z) {
    grid.set(`${x},${y},${z}`, c);
  }
}

function getVoxel(x, y, z) {
  return grid.get(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`);
}

function ellipsoid(cx, cy, cz, rx, ry, rz, color) {
  for(let x = -rx; x <= rx; x++) {
    for(let y = -ry; y <= ry; y++) {
      for(let z = -rz; z <= rz; z++) {
        const dist = (x*x)/(rx*rx) + (y*y)/(ry*ry) + (z*z)/(rz*rz);
        if(dist <= 1.0) setVoxel(cx + x, cy + y, cz + z, color);
      }
    }
  }
}

function box(x1, y1, z1, x2, y2, z2, color) {
  for(let x=Math.min(x1,x2); x<=Math.max(x1,x2); x++) {
    for(let y=Math.min(y1,y2); y<=Math.max(y1,y2); y++) {
      for(let z=Math.min(z1,z2); z<=Math.max(z1,z2); z++) {
        setVoxel(x, y, z, color);
      }
    }
  }
}

// ---------------------------------------------------------
// MODELADO ORGÁNICO
// Centro: X=48, Y=48 (profundidad), Z=0 (base)
// ---------------------------------------------------------

// 1. TORSO (Z=12 a 34)
ellipsoid(48, 48, 24, 15, 12, 14, colorMap.body_base_blue);
// Abdomen celeste frontal (Ligeramente sobresaliente)
ellipsoid(48, 36, 24, 10, 3, 10, colorMap.belly_mid_cyan);
ellipsoid(48, 35, 24, 8, 2, 8, colorMap.belly_light_cyan); // highlight
// Sombra dorsal
ellipsoid(48, 56, 24, 14, 4, 12, colorMap.body_dark_blue);

// 2. CABEZA (Z=36 a 64) - 45% de altura
// Cráneo base más ancho arriba
for(let z=32; z<=62; z++) {
  const hFactor = (z - 32) / 30; // 0 to 1
  let rx = 18 + Math.sin(hFactor * Math.PI) * 4;
  let ry = 15 + Math.sin(hFactor * Math.PI) * 2;
  // Cima redondeada
  if (z > 56) {
    rx -= (z-56)*2;
    ry -= (z-56)*1.5;
  }
  for(let x=-rx; x<=rx; x++) {
    for(let y=-ry; y<=ry; y++) {
      if ((x*x)/(rx*rx) + (y*y)/(ry*ry) <= 1) {
        setVoxel(48+x, 48+y, z, colorMap.body_base_blue);
      }
    }
  }
}

// Antifaz celeste (base para los ojos)
ellipsoid(39, 36, 48, 8, 3, 9, colorMap.belly_light_cyan);
ellipsoid(57, 36, 48, 8, 3, 9, colorMap.belly_light_cyan);

// Ojos gigantes, almendrados e inclinados
function drawEye(cx, cy, cz, dir) {
  // dir: -1 for left, 1 for right
  for(let dx=-5; dx<=5; dx++) {
    for(let dy=-3; dy<=3; dy++) {
      for(let dz=-7; dz<=7; dz++) {
        // Rotated ellipse logic
        const tilt = 0.3 * dir; 
        const nx = dx * Math.cos(tilt) - dz * Math.sin(tilt);
        const nz = dx * Math.sin(tilt) + dz * Math.cos(tilt);
        
        if ((nx*nx)/(4*4) + (dy*dy)/(2*2) + (nz*nz)/(6*6) <= 1) {
          setVoxel(cx+dx, cy+dy, cz+dz, colorMap.eye_black);
        }
      }
    }
  }
  // Highlights
  setVoxel(cx + dir*2, cy - 2, cz + 3, colorMap.eye_highlight_white);
  setVoxel(cx + dir*2, cy - 2, cz + 4, colorMap.eye_highlight_white);
  setVoxel(cx + dir*1, cy - 2, cz + 4, colorMap.eye_highlight_white);
}
drawEye(38, 35, 48, -1);
drawEye(58, 35, 48, 1);

// Hocico / Nariz
ellipsoid(48, 33, 40, 7, 5, 5, colorMap.body_base_blue); // base morro
ellipsoid(48, 31, 41, 6, 3, 4, colorMap.nose_muzzle_purple); // nariz real
box(45, 29, 41, 51, 30, 42, colorMap.nose_muzzle_dark); // brillo/sombra de nariz
setVoxel(46, 28, 42, colorMap.eye_highlight_white); // brillo nariz

// 3. OREJAS (Gigantes, laterales, curvadas)
function buildOrganicear(isRight) {
  const dir = isRight ? 1 : -1;
  const startX = 48 + (dir * 20);
  const startY = 48;
  const startZ = 46;
  
  for(let t=0; t<=1.0; t+=0.02) {
    const cx = startX + (dir * t * 30);
    const cy = startY + (Math.sin(t*Math.PI)*5);
    const cz = startZ + (t * 22) - (Math.pow(t, 2)*8); // Curve up and slightly down
    
    // Width and height of ear slice
    const w = 2 + Math.sin(t*Math.PI)*4;
    const h = 4 + Math.sin(t*Math.PI)*12;
    
    // Outer border
    ellipsoid(cx, cy, cz, w, 2, h, colorMap.body_dark_blue);
    // Inner pink
    ellipsoid(cx, cy - 1, cz, w-1, 2, h-2, colorMap.ear_inner_pink);
  }
}
buildOrganicear(false);
buildOrganicear(true);

// 4. BRAZOS (2 principales + 2 secundarios)
function buildOrganicArm(sx, sy, sz, dirX, dirZ, length) {
  for(let i=0; i<length; i++) {
    const cx = sx + (dirX * i);
    const cy = sy - (i * 0.4);
    const cz = sz + (dirZ * i);
    ellipsoid(cx, cy, cz, 3, 3, 3, colorMap.body_base_blue);
  }
  // Mano/Garras
  const endX = sx + (dirX * length);
  const endY = sy - (length * 0.4);
  const endZ = sz + (dirZ * length);
  ellipsoid(endX, endY, endZ, 4, 4, 4, colorMap.body_dark_blue);
  // Garras oscuras
  setVoxel(endX + dirX*2, endY-2, endZ, colorMap.claw_dark);
  setVoxel(endX + dirX*2, endY-2, endZ+1, colorMap.claw_dark);
  setVoxel(endX + dirX*2, endY-2, endZ-1, colorMap.claw_dark);
}
// Upper main arms
buildOrganicArm(32, 48, 28, -1, -0.2, 10);
buildOrganicArm(64, 48, 28, 1, -0.2, 10);
// Lower secondary arms
buildOrganicArm(34, 48, 20, -1, -0.5, 8);
buildOrganicArm(62, 48, 20, 1, -0.5, 8);

// 5. PIERNAS Y PIES
// Piernas gruesas
ellipsoid(38, 48, 12, 6, 6, 6, colorMap.body_base_blue);
ellipsoid(58, 48, 12, 6, 6, 6, colorMap.body_base_blue);
// Pies estables (planos abajo)
for(let x=33; x<=43; x++) {
  for(let y=40; y<=52; y++) {
    for(let z=2; z<=8; z++) {
      if ((x-38)**2/25 + (y-46)**2/36 + (z-5)**2/9 <= 1) {
        setVoxel(x, y, z, colorMap.body_base_blue);
      }
    }
  }
}
for(let x=53; x<=63; x++) {
  for(let y=40; y<=52; y++) {
    for(let z=2; z<=8; z++) {
      if ((x-58)**2/25 + (y-46)**2/36 + (z-5)**2/9 <= 1) {
        setVoxel(x, y, z, colorMap.body_base_blue);
      }
    }
  }
}
// Uñas/Garras de pies
box(34, 38, 2, 35, 39, 3, colorMap.claw_dark);
box(38, 38, 2, 39, 39, 3, colorMap.claw_dark);
box(42, 38, 2, 43, 39, 3, colorMap.claw_dark);

box(53, 38, 2, 54, 39, 3, colorMap.claw_dark);
box(57, 38, 2, 58, 39, 3, colorMap.claw_dark);
box(61, 38, 2, 62, 39, 3, colorMap.claw_dark);

// 6. COLLAR ROJO
for(let t=0; t<Math.PI*2; t+=0.05) {
  const cx = 48 + Math.cos(t)*11;
  const cy = 48 + Math.sin(t)*10;
  ellipsoid(cx, cy, 33, 1, 1, 1, colorMap.collar_red);
}

// 7. ANTENAS (Delgadas)
function buildAntenna(sx, dirX) {
  for(let i=0; i<12; i++) {
    const cx = sx + (dirX * i * 0.3);
    const cz = 62 + i;
    const color = i > 8 ? colorMap.antenna_tip_dark : colorMap.body_base_blue;
    setVoxel(cx, 48, cz, color);
    setVoxel(cx+1, 48, cz, color);
    setVoxel(cx, 49, cz, color);
  }
}
buildAntenna(43, -1);
buildAntenna(53, 1);

// Convert Map to voxels array
const voxels = [];
for (const [key, c] of grid.entries()) {
  const [x, y, z] = key.split(',').map(Number);
  voxels.push({x, y, z, i: c});
}

// ==========================
// 1. SAVE .VOX
// ==========================
const paletteColors = Array.from({length: 256}).map(() => ({r:0, g:0, b:0, a:0}));
for(let i=1; i<palette.length; i++) {
  paletteColors[i-1] = {r: palette[i].r, g: palette[i].g, b: palette[i].b, a: 255};
}

const voxData = {
  size: size,
  xyzi: {
    numVoxels: voxels.length,
    values: voxels
  },
  rgba: {
    values: paletteColors
  }
};

const writtenVox = writeVox(voxData);
fs.writeFileSync(path.join(OUTPUT_DIR, 'model.vox'), Buffer.from(writtenVox));

// ==========================
// 2. EXPORT .OBJ & .MTL
// ==========================
let objData = `# Voxel Stitch Organic Refinement\nmtllib model.mtl\n`;
let mtlData = `# Voxel Materials\n`;

const colorGroups = {};
for(const v of voxels) {
  if(!colorGroups[v.i]) colorGroups[v.i] = [];
  colorGroups[v.i].push(v);
}

for(const c in colorGroups) {
  const color = palette[c];
  mtlData += `newmtl mat${c}\nKd ${(color.r/255).toFixed(3)} ${(color.g/255).toFixed(3)} ${(color.b/255).toFixed(3)}\n`;
}
fs.writeFileSync(path.join(OUTPUT_DIR, 'model.mtl'), mtlData);

let vOffset = 1;
for(const c in colorGroups) {
  objData += `\nusemtl mat${c}\n`;
  for(const v of colorGroups[c]) {
    const {x, y, z} = v;
    objData += `v ${x} ${y} ${z}\nv ${x+1} ${y} ${z}\nv ${x+1} ${y+1} ${z}\nv ${x} ${y+1} ${z}\nv ${x} ${y} ${z+1}\nv ${x+1} ${y} ${z+1}\nv ${x+1} ${y+1} ${z+1}\nv ${x} ${y+1} ${z+1}\n`;
    objData += `f ${vOffset} ${vOffset+1} ${vOffset+2} ${vOffset+3}\nf ${vOffset+4} ${vOffset+5} ${vOffset+6} ${vOffset+7}\nf ${vOffset} ${vOffset+1} ${vOffset+5} ${vOffset+4}\nf ${vOffset+1} ${vOffset+2} ${vOffset+6} ${vOffset+5}\nf ${vOffset+2} ${vOffset+3} ${vOffset+7} ${vOffset+6}\nf ${vOffset+3} ${vOffset} ${vOffset+4} ${vOffset+7}\n`;
    vOffset += 8;
  }
}
fs.writeFileSync(path.join(OUTPUT_DIR, 'model.obj'), objData);

// ==========================
// 3. EXPORT METADATA.JSON
// ==========================
const metadata = {
  name: "blue_alien_pet",
  assetType: "animal",
  style: "cute_mobile_voxel",
  dimensions: size,
  voxelCount: voxels.length,
  palette: colors,
  status: "success",
  notes: "Refined highly organic voxel model based strictly on image B. Massive ears, round head, exact color codes, zero robotic elements."
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

console.log("V2 Highly Organic Stitch generated successfully!");
