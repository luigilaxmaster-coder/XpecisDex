import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\generated\\voxels\\reindeer";

if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. PALETA CUANTIZADA
const colors = {
  hoof_black:      {r: 66,  g: 66,  b: 68},
  belly_white:     {r: 255, g: 255, b: 255},
  body_mid_grey:   {r: 153, g: 155, b: 157}, // Main body grey
  body_dark_grey:  {r: 130, g: 132, b: 134}, // Shaded areas
  antler_pink:     {r: 220, g: 88,  b: 125}, // Main bright pink
  antler_dark:     {r: 189, g: 62,  b: 98},  // Shaded pink
  eye_black:       {r: 30,  g: 30,  b: 30},
  nose_black:      {r: 50,  g: 50,  b: 50}
};

const palette = [ {r:0,g:0,b:0} ];
const colorMap = {};
let idx = 1;
for (const [name, rgb] of Object.entries(colors)) {
  palette.push(rgb);
  colorMap[name] = idx++;
}

// 2. GRID Y FUNCIONES BOOLEANAS
// Grid de 64x64x64
const size = {x: 64, y: 64, z: 64};
const grid = new Map();

function setBlock(bx, by, bz, c) {
  // Vamos a escalar 1 "bloque" visual a 2x2x2 voxels para mayor fidelidad en exportación
  const scale = 2;
  const startX = bx * scale;
  const startY = by * scale;
  const startZ = bz * scale;
  
  for(let i=0; i<scale; i++) {
    for(let j=0; j<scale; j++) {
      for(let k=0; k<scale; k++) {
        grid.set(`${startX+i},${startY+j},${startZ+k}`, c);
      }
    }
  }
}

// ==========================
// 3. ESTRUCTURA DE MASAS (VGM-P Blocky Implementation)
// Origen: Frente es menor Y, Atrás es mayor Y.
// ==========================

// --- MASS 04: PIERNAS ---
function buildLeg(x, y) {
  setBlock(x, y, 0, colorMap.hoof_black);
  setBlock(x, y, 1, colorMap.belly_white);
  setBlock(x, y, 2, colorMap.belly_white);
  setBlock(x, y, 3, colorMap.body_dark_grey);
}
buildLeg(12, 16); // Front Left (mirando desde frente)
buildLeg(16, 16); // Front Right
buildLeg(12, 26); // Back Left
buildLeg(16, 26); // Back Right

// --- MASS 01: TORSO ---
// Base del vientre blanco
for(let x=12; x<=16; x++) {
  for(let y=16; y<=27; y++) {
    // El blanco sube un poco en los laterales
    setBlock(x, y, 4, colorMap.belly_white);
    if(x === 12 || x === 16) {
      if(y > 17 && y < 25) setBlock(x, y, 5, colorMap.belly_white);
    }
  }
}

// Cuerpo gris
for(let x=12; x<=16; x++) {
  for(let y=16; y<=27; y++) {
    for(let z=4; z<=8; z++) {
      // Evitar sobreescribir el blanco
      let isWhite = (z===4) || ((x===12 || x===16) && z===5 && y>17 && y<25);
      if(!isWhite) {
        // Shading básico
        let c = (x===16) ? colorMap.body_dark_grey : colorMap.body_mid_grey;
        setBlock(x, y, z, c);
      }
    }
  }
}
// Parte trasera
for(let x=12; x<=16; x++) {
  setBlock(x, 28, 4, colorMap.body_dark_grey);
  setBlock(x, 28, 5, colorMap.body_dark_grey);
  setBlock(x, 28, 6, colorMap.body_dark_grey);
}

// --- MASS 02: CUELLO Y CABEZA ---
// Cuello sube en diagonal hacia adelante
// Z=8 a 13
for(let z=9; z<=13; z++) {
  let yStart = 16 - (z-8); 
  for(let x=13; x<=15; x++) {
    setBlock(x, yStart, z, colorMap.belly_white); // Pecho blanco
    setBlock(x, yStart+1, z, colorMap.body_mid_grey);
    setBlock(x, yStart+2, z, colorMap.body_mid_grey);
    setBlock(x, yStart+3, z, colorMap.body_dark_grey);
  }
}

// Cabeza (bloque principal)
// Z=14 a 16
for(let x=12; x<=16; x++) {
  for(let y=9; y<=14; y++) {
    for(let z=14; z<=17; z++) {
      let c = (x===16 || y===14) ? colorMap.body_dark_grey : colorMap.body_mid_grey;
      setBlock(x, y, z, c);
    }
  }
}

// --- MASS 03: HOCICO Y OJOS ---
// Hocico
for(let x=13; x<=15; x++) {
  setBlock(x, 8, 14, colorMap.nose_black);
  setBlock(x, 8, 15, colorMap.nose_black);
  setBlock(x, 7, 14, colorMap.nose_black); // sobresale un poco
  setBlock(x, 7, 15, colorMap.nose_black);
  
  // Detalle blanco encima del hocico
  setBlock(x, 8, 16, colorMap.belly_white);
}

// Ojos
setBlock(12, 11, 16, colorMap.eye_black);
setBlock(16, 11, 16, colorMap.eye_black);


// --- MASS 05: CUERNOS (ANTLERS) ROSAS ---
function drawAntlerBranch(startX, startY, startZ, isRight) {
  let x = startX;
  let y = startY;
  let z = startZ;
  let c = isRight ? colorMap.antler_dark : colorMap.antler_pink;
  
  // Tronco principal subiendo y yendo hacia atrás
  setBlock(x, y, z, c);
  setBlock(x, y, z+1, c);
  setBlock(x, y+1, z+2, c);
  setBlock(x, y+2, z+2, c);
  setBlock(x, y+3, z+3, c);
  setBlock(x, y+4, z+4, c);
  
  // Ramificación delantera
  setBlock(x, y+1, z+3, c);
  setBlock(x, y+1, z+4, c);
  
  // Ramificación superior
  setBlock(x, y+3, z+4, c);
  setBlock(x, y+3, z+5, c);
  
  // Curva trasera alta
  setBlock(x, y+5, z+5, c);
  setBlock(x, y+6, z+6, c);
  setBlock(x, y+7, z+7, c);
  
  // Punta extra trasera
  setBlock(x, y+5, z+6, c);
  setBlock(x, y+5, z+7, c);
}

drawAntlerBranch(12, 13, 18, false); // Left antler
drawAntlerBranch(16, 13, 18, true);  // Right antler (darker shaded)

// Extra conexión a la cabeza
setBlock(12, 13, 17, colorMap.body_mid_grey);
setBlock(16, 13, 17, colorMap.body_dark_grey);


// ==========================
// 4. EXPORTACIÓN (.VOX y .OBJ)
// ==========================
const voxels = [];
for (const [key, c] of grid.entries()) {
  const [x, y, z] = key.split(',').map(Number);
  voxels.push({x, y, z, i: c});
}

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

// Exportación a .OBJ
let objData = `# VGM-P Strict Blocky Reindeer\nmtllib model.mtl\n`;
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

const metadata = {
  name: "blocky_pink_reindeer",
  protocol: "VGM-P",
  voxelCount: voxels.length,
  palette: colors,
  status: "success"
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

console.log("Reindeer generated successfully!");
