import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\generated\\voxels\\blue_alien_pet";

const palette = [
  {r: 0, g: 0, b: 0, a: 0}, // index 0 is transparent in our internal map, but for vox-saver palette starts at index 0 for color 1
  {r: 47, g: 95, b: 143, a: 255},   // 1: body (#2F5F8F)
  {r: 30, g: 63, b: 102, a: 255},   // 2: bodyDark (#1E3F66)
  {r: 19, g: 43, b: 71, a: 255},    // 3: bodyDeep (#132B47)
  {r: 79, g: 134, b: 184, a: 255},  // 4: bodyLight (#4F86B8)
  {r: 127, g: 199, b: 217, a: 255}, // 5: belly (#7FC7D9)
  {r: 197, g: 138, b: 199, a: 255}, // 6: earInner (#C58AC7)
  {r: 91, g: 45, b: 122, a: 255},   // 7: muzzle/nose (#5B2D7A)
  {r: 5, g: 7, b: 10, a: 255},      // 8: eye (#05070A)
  {r: 234, g: 246, b: 255, a: 255}, // 9: eyeHighlight (#EAF6FF)
  {r: 192, g: 24, b: 24, a: 255},   // 10: collar (#C01818)
  {r: 240, g: 200, b: 30, a: 255}   // 11: yellow tag
];

const size = {x: 96, y: 80, z: 96};
const grid = new Map();

function setVoxel(x, y, z, c) {
  x = Math.round(x);
  y = Math.round(y);
  z = Math.round(z);
  if(x>=0 && x<size.x && y>=0 && y<size.y && z>=0 && z<size.z) {
    grid.set(`${x},${y},${z}`, c);
  }
}

function ellipsoid(cx, cy, cz, rx, ry, rz, color) {
  for(let x = -rx; x <= rx; x++) {
    for(let y = -ry; y <= ry; y++) {
      for(let z = -rz; z <= rz; z++) {
        const dist = (x*x)/(rx*rx) + (y*y)/(ry*ry) + (z*z)/(rz*rz);
        if(dist <= 1.0) {
          setVoxel(cx + x, cy + y, cz + z, color);
        }
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

function torus(cx, cy, cz, r_major, r_minor, height, color) {
  for(let x = -r_major-r_minor; x <= r_major+r_minor; x++) {
    for(let y = -r_major-r_minor; y <= r_major+r_minor; y++) {
      for(let z = 0; z <= height; z++) {
        const r = Math.sqrt(x*x + y*y);
        const dist = Math.abs(r - r_major);
        if(dist <= r_minor) {
          setVoxel(cx + x, cy + y, cz + z, color);
        }
      }
    }
  }
}

// 1. Head
ellipsoid(48, 32, 54, 18, 14, 16, 1);
// Thicken cheeks
ellipsoid(38, 32, 50, 6, 8, 8, 1);
ellipsoid(58, 32, 50, 6, 8, 8, 1);
// Brow ridge
ellipsoid(48, 25, 62, 12, 5, 5, 1);

// 2. Body
ellipsoid(48, 36, 29, 14, 11, 16, 1);
// Belly
ellipsoid(48, 26, 28, 8, 4, 12, 5);

// 3. Eyes
// Left eye
ellipsoid(39, 21, 56, 4, 2, 6, 8);
box(37, 19, 58, 39, 20, 60, 9); // highlight
// Right eye
ellipsoid(57, 21, 56, 4, 2, 6, 8);
box(55, 19, 58, 57, 20, 60, 9); // highlight

// Light blue eye masks
ellipsoid(40, 24, 55, 6, 2, 8, 4);
ellipsoid(56, 24, 55, 6, 2, 8, 4);
// Re-draw eyes to be on top of masks
ellipsoid(39, 21, 56, 4, 2, 6, 8);
box(37, 19, 58, 39, 20, 60, 9);
ellipsoid(57, 21, 56, 4, 2, 6, 8);
box(55, 19, 58, 57, 20, 60, 9);

// 4. Muzzle & Nose
ellipsoid(48, 18, 46, 8, 6, 5, 1); // Muzzle base
ellipsoid(48, 15, 48, 6, 3, 4, 7); // Nose dark purple

// 5. Collar
torus(48, 36, 40, 10, 1, 1, 10);
box(47, 25, 39, 49, 26, 41, 11); // Tag

// 6. Ears
function buildEar(isRight) {
  const dirX = isRight ? 1 : -1;
  const startX = 48 + (dirX * 18);
  const startY = 32;
  const startZ = 52;
  
  for(let i=0; i<25; i++) {
    const cx = startX + (dirX * i * 1.0);
    const cy = startY + (i * 0.1);
    const cz = startZ + (i * 0.5);
    
    // Ear grows wider then tapers
    const w = 2 + Math.sin((i/25)*Math.PI) * 4;
    const h = 4 + Math.sin((i/25)*Math.PI) * 8;
    
    // Outline dark blue
    ellipsoid(cx, cy, cz, w, 1, h, 2);
    // Inner pink
    ellipsoid(cx, cy - 1, cz, w-1, 1, h-2, 6);
  }
}
buildEar(false);
buildEar(true);

// 7. Arms (4 arms!)
function buildArm(startX, startY, startZ, dirX, length) {
  for(let i=0; i<length; i++) {
    const cx = startX + (dirX * i);
    const cy = startY - (i * 0.5);
    const cz = startZ - (i * 0.3);
    ellipsoid(cx, cy, cz, 2, 2, 2, 1);
  }
  // Claws at end
  const ex = startX + (dirX * length);
  const ey = startY - (length * 0.5);
  const ez = startZ - (length * 0.3);
  box(ex, ey-1, ez, ex+(dirX*2), ey+1, ez+1, 3);
}

// Upper arms
buildArm(34, 36, 32, -1, 10);
buildArm(62, 36, 32, 1, 10);
// Lower arms
buildArm(36, 36, 24, -1, 8);
buildArm(60, 36, 24, 1, 8);

// 8. Legs
ellipsoid(40, 36, 16, 5, 6, 6, 1);
ellipsoid(56, 36, 16, 5, 6, 6, 1);
// Feet
ellipsoid(40, 30, 11, 4, 6, 3, 1);
ellipsoid(56, 30, 11, 4, 6, 3, 1);
// Claws
box(37, 24, 10, 38, 25, 11, 3);
box(40, 24, 10, 41, 25, 11, 3);
box(43, 24, 10, 44, 25, 11, 3);
box(53, 24, 10, 54, 25, 11, 3);
box(56, 24, 10, 57, 25, 11, 3);
box(59, 24, 10, 60, 25, 11, 3);

// 9. Antennae
for(let i=0; i<8; i++) {
  setVoxel(44, 32, 70 + i, 1);
  setVoxel(52, 32, 70 + i, 1);
}
setVoxel(44, 32, 78, 3);
setVoxel(52, 32, 78, 3);

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
let objData = `# Voxel Stitch\nmtllib model.mtl\n`;
let mtlData = `# Voxel Materials\n`;

// Group by color
const colorGroups = {};
for(const v of voxels) {
  if(!colorGroups[v.i]) colorGroups[v.i] = [];
  colorGroups[v.i].push(v);
}

// Write MTL
for(const c in colorGroups) {
  const color = palette[c];
  mtlData += `newmtl mat${c}\nKd ${(color.r/255).toFixed(3)} ${(color.g/255).toFixed(3)} ${(color.b/255).toFixed(3)}\n`;
}
fs.writeFileSync(path.join(OUTPUT_DIR, 'model.mtl'), mtlData);

// Write OBJ
let vOffset = 1;
for(const c in colorGroups) {
  objData += `\nusemtl mat${c}\n`;
  for(const v of colorGroups[c]) {
    const {x, y, z} = v;
    // 8 vertices for a cube
    objData += `v ${x} ${y} ${z}\nv ${x+1} ${y} ${z}\nv ${x+1} ${y+1} ${z}\nv ${x} ${y+1} ${z}\nv ${x} ${y} ${z+1}\nv ${x+1} ${y} ${z+1}\nv ${x+1} ${y+1} ${z+1}\nv ${x} ${y+1} ${z+1}\n`;
    
    // 6 faces (quads)
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
  palette: {
    body: "#2F5F8F",
    bodyDark: "#1E3F66",
    bodyDeep: "#132B47",
    bodyLight: "#4F86B8",
    belly: "#7FC7D9",
    earInner: "#C58AC7",
    muzzle: "#5B2D7A",
    eye: "#05070A",
    eyeHighlight: "#EAF6FF",
    collar: "#C01818"
  },
  status: "success",
  notes: "Organically generated voxel model with complex layered ellipsoids and full volumetric depth."
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

console.log("Stitch generated successfully!");
