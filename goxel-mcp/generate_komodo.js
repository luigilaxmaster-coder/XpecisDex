import fs from 'fs';
import path from 'path';
import writeVox from 'vox-saver';

const OUTPUT_DIR = "C:\\Users\\PD2\\Desktop\\XpecisDex\\generated\\voxels\\komodo";

if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. PALETA ORGÁNICA REALISTA (Quantized)
const colors = {
  skin_shadow:  {r: 47,  g: 42,  b: 38},   // #2F2A26
  skin_base:    {r: 91,  g: 77,  b: 65},   // #5B4D41
  skin_light:   {r: 138, g: 122, b: 102},  // #8A7A66
  skin_dark:    {r: 68,  g: 58,  b: 50},   // #443A32
  belly_light:  {r: 161, g: 147, b: 129},  // Vientre más pálido
  tongue_yel:   {r: 226, g: 194, b: 125},  // #E2C27D
  tongue_shad:  {r: 186, g: 154, b: 90},
  eye_glint:    {r: 200, g: 160, b: 80},   // Brillo del ojo reptil
  eye_pupil:    {r: 10,  g: 10,  b: 10},
  claw_dark:    {r: 26,  g: 24,  b: 23}    // #1A1817
};

const palette = [ {r:0,g:0,b:0} ];
const colorMap = {};
let idx = 1;
for (const [name, rgb] of Object.entries(colors)) {
  palette.push(rgb);
  colorMap[name] = idx++;
}

// Grid de Alta Resolución 128x128x128
const size = {x: 128, y: 128, z: 128};
const grid = new Map();

// Helper para texturizado (Laplacian Pseudo-noise)
function getSkinColor(x, y, z, nx, ny, nz) {
  // Simular escamas con ondas de alta frecuencia
  const noise = Math.sin(x * 1.5) * Math.sin(y * 1.5) + Math.sin(z * 1.2);
  
  // Iluminación direccional simple (luz desde arriba z+)
  const dot = nz; 
  
  if (nz < -0.3) return colorMap.belly_light; // Vientre
  if (dot < 0) return colorMap.skin_shadow;
  
  if (noise > 0.8) return colorMap.skin_light;
  if (noise < -0.5) return colorMap.skin_dark;
  return colorMap.skin_base;
}

function setVoxel(x, y, z, baseColorStr = null, nx=0, ny=0, nz=1) {
  x = Math.round(x);
  y = Math.round(y);
  z = Math.round(z);
  if(x>=0 && x<size.x && y>=0 && y<size.y && z>=0 && z<size.z) {
    let c;
    if(baseColorStr) {
      c = colorMap[baseColorStr];
    } else {
      c = getSkinColor(x, y, z, nx, ny, nz);
    }
    grid.set(`${x},${y},${z}`, c);
  }
}

// Primitiva de Elipsoide SDF con normales
function organicEllipsoid(cx, cy, cz, rx, ry, rz, sY=0) {
  for(let x = -rx; x <= rx; x++) {
    for(let y = -ry; y <= ry; y++) {
      for(let z = -rz; z <= rz; z++) {
        // Deformación (Sagging en Y) para simular peso
        const deformZ = z + (y*y)*sY;
        
        const dist = (x*x)/(rx*rx) + (y*y)/(ry*ry) + (deformZ*deformZ)/(rz*rz);
        if(dist <= 1.0) {
          // Normal aproximada
          const nx = (x / (rx*rx));
          const ny = (y / (ry*ry));
          const nz = (deformZ / (rz*rz));
          const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
          setVoxel(cx + x, cy + y, cz + z, null, nx/len, ny/len, nz/len);
        }
      }
    }
  }
}

// Cápsula para patas/cola
function organicCapsule(p1x, p1y, p1z, p2x, p2y, p2z, r1, r2) {
  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const dz = p2z - p1z;
  const length = Math.sqrt(dx*dx + dy*dy + dz*dz);
  const steps = Math.ceil(length * 2);
  
  for(let i=0; i<=steps; i++) {
    const t = i / steps;
    const cx = p1x + dx * t;
    const cy = p1y + dy * t;
    const cz = p1z + dz * t;
    const r = r1 * (1 - t) + r2 * t; // Interpolación de radio
    organicEllipsoid(cx, cy, cz, r, r, r);
  }
}


// ==========================
// 3. CONSTRUCCIÓN DE MASAS
// Origen X=64 (centro), Z=20 (suelo)
// ==========================

// --- MASS 01: TORSO ---
// Torso muy pesado y ancho, arrastrando casi en el suelo
// cx=64, cy=64, cz=35. Sagging sY=0.005 para que la barriga caiga en el medio.
organicEllipsoid(64, 64, 30, 22, 35, 16, -0.003); 

// --- MASS 02: CUELLO Y CABEZA ---
// Cuello grueso
organicCapsule(64, 35, 30, 64, 15, 36, 16, 11);
// Cabeza plana y alargada
organicEllipsoid(64, 10, 36, 11, 14, 8); // Cráneo
organicEllipsoid(64, -2, 34, 9, 12, 6);  // Hocico

// Ojos (Laterales, estilo reptil)
setVoxel(55, 6, 38, 'eye_glint');
setVoxel(54, 6, 38, 'eye_pupil');
setVoxel(55, 5, 38, 'eye_pupil');

setVoxel(73, 6, 38, 'eye_glint');
setVoxel(74, 6, 38, 'eye_pupil');
setVoxel(73, 5, 38, 'eye_pupil');

// --- MASS 03: LENGUA BÍFIDA ---
function drawTongue() {
  for(let i=0; i<15; i++) {
    const tz = 32 - i*0.8;
    const ty = -14 - i;
    // Tallo principal
    if (i < 8) {
      setVoxel(64, ty, tz, 'tongue_yel');
      setVoxel(64, ty, tz-1, 'tongue_shad');
    } else {
      // Bifurcación
      const spread = (i - 8) * 0.4;
      setVoxel(64 - spread, ty, tz, 'tongue_yel');
      setVoxel(64 + spread, ty, tz, 'tongue_yel');
    }
  }
}
drawTongue();

// --- MASS 05: COLA ---
// Curva gigantesca hacia atrás
function drawTail() {
  for(let i=0; i<=45; i++) {
    const t = i / 45; // 0 to 1
    // Curvatura sinusoidal
    const cx = 64 + Math.sin(t * Math.PI) * 20; 
    const cy = 95 + i * 2;
    const cz = 25 - t * 10; // Cae al suelo
    const r = 14 * (1 - Math.pow(t, 0.7)); // Se afina gradualmente
    
    organicEllipsoid(cx, cy, cz, r, 3, r*0.8);
  }
}
drawTail();

// --- MASS 04: EXTREMIDADES (SPLAYED) ---
// Reptiles tienen codos/rodillas hacia afuera y arriba
function buildLeg(sx, sy, sz, dirX, isFront) {
  const shoulderX = sx + dirX*10;
  const shoulderZ = sz + 5;
  const elbowX = shoulderX + dirX*12;
  const elbowY = isFront ? sy + 5 : sy - 5;
  const elbowZ = shoulderZ + 8; // Codo/Rodilla hacia arriba
  
  const footX = elbowX + dirX*2;
  const footY = isFront ? elbowY - 12 : elbowY + 10;
  const footZ = 10; // Suelo
  
  // Muslo
  organicCapsule(shoulderX, sy, shoulderZ, elbowX, elbowY, elbowZ, 8, 6);
  // Pantorrilla
  organicCapsule(elbowX, elbowY, elbowZ, footX, footY, footZ, 6, 4);
  
  // Pie y garras
  organicEllipsoid(footX, footY, footZ, 5, 6, 3);
  // 3 Garras
  for(let i=-2; i<=2; i+=2) {
    const clawDirY = isFront ? -1 : 1;
    setVoxel(footX + i, footY + clawDirY*5, footZ-1, 'claw_dark');
    setVoxel(footX + i, footY + clawDirY*6, footZ-2, 'claw_dark');
  }
}

// Delanteras
buildLeg(64, 25, 20, -1, true); // Izquierda
buildLeg(64, 25, 20, 1, true);  // Derecha

// Traseras
buildLeg(64, 85, 25, -1, false);
buildLeg(64, 85, 25, 1, false);


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
let objData = `# VGM-P Organic Komodo Dragon\nmtllib model.mtl\n`;
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
  name: "komodo_dragon_realistic",
  protocol: "VGM-P",
  voxelCount: voxels.length,
  palette: colors,
  status: "success"
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

console.log("Komodo Dragon generated successfully!");
