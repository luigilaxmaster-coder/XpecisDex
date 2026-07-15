const { spawn } = require('child_process');

const script = `
const voxels = [];
const size = {x: 80, y: 80, z: 80};
const color = {
  blue: 1,
  lightBlue: 2,
  darkBlue: 3,
  pink: 4,
  black: 5,
  white: 6,
  red: 7,
  yellow: 8
};

const palette = [];
palette[color.blue] = {r: 74, g: 108, b: 168, a: 255};      
palette[color.lightBlue] = {r: 104, g: 172, b: 200, a: 255}; 
palette[color.darkBlue] = {r: 25, g: 30, b: 80, a: 255};    
palette[color.pink] = {r: 200, g: 140, b: 180, a: 255};     
palette[color.black] = {r: 20, g: 20, b: 20, a: 255};
palette[color.white] = {r: 240, g: 240, b: 240, a: 255};
palette[color.red] = {r: 200, g: 20, b: 20, a: 255};
palette[color.yellow] = {r: 220, g: 200, b: 20, a: 255};

function addBox(x0, y0, z0, dx, dy, dz, c) {
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  z0 = Math.floor(z0);
  dx = Math.floor(dx);
  dy = Math.floor(dy);
  dz = Math.floor(dz);
  
  for(let x=x0; x<x0+dx; x++) {
    for(let y=y0; y<y0+dy; y++) {
      for(let z=z0; z<z0+dz; z++) {
        voxels.push({x, y, z, i: c});
      }
    }
  }
}

// Center is x=40, y=40

// Legs (z=10 to 14)
addBox(32, 38, 10, 5, 6, 4, color.blue); 
addBox(43, 38, 10, 5, 6, 4, color.blue); 
// Claws
addBox(32, 37, 10, 1, 1, 1, color.darkBlue);
addBox(34, 37, 10, 1, 1, 1, color.darkBlue);
addBox(36, 37, 10, 1, 1, 1, color.darkBlue);
addBox(43, 37, 10, 1, 1, 1, color.darkBlue);
addBox(45, 37, 10, 1, 1, 1, color.darkBlue);
addBox(47, 37, 10, 1, 1, 1, color.darkBlue);

// Torso (z=14 to 30)
addBox(33, 37, 14, 14, 10, 16, color.blue); 

// Belly (Light blue, on front y=36, z=15 to 28)
addBox(35, 36, 15, 10, 1, 13, color.lightBlue);

// Collar (z=30 to 32)
addBox(34, 36, 30, 12, 11, 2, color.red);
// Tag (Yellow)
addBox(39, 35, 28, 2, 1, 3, color.yellow);

// Lower Arms
addBox(24, 39, 18, 9, 4, 4, color.blue);
addBox(23, 39, 18, 1, 1, 1, color.darkBlue);
addBox(23, 41, 18, 1, 1, 1, color.darkBlue);
addBox(47, 39, 18, 9, 4, 4, color.blue);
addBox(56, 39, 18, 1, 1, 1, color.darkBlue); 
addBox(56, 41, 18, 1, 1, 1, color.darkBlue);

// Upper Arms
addBox(23, 39, 25, 10, 4, 4, color.blue);
addBox(22, 39, 25, 1, 1, 1, color.darkBlue);
addBox(22, 41, 25, 1, 1, 1, color.darkBlue);
addBox(47, 39, 25, 10, 4, 4, color.blue);
addBox(57, 39, 25, 1, 1, 1, color.darkBlue);
addBox(57, 41, 25, 1, 1, 1, color.darkBlue);

// Head
addBox(30, 34, 32, 20, 16, 18, color.blue);

// Eyes background
addBox(31, 33, 36, 8, 1, 10, color.lightBlue);
addBox(41, 33, 36, 8, 1, 10, color.lightBlue);

// Eyes
addBox(33, 32, 38, 4, 1, 6, color.black); 
addBox(35, 31, 41, 1, 1, 1, color.white); 
addBox(43, 32, 38, 4, 1, 6, color.black); 
addBox(45, 31, 41, 1, 1, 1, color.white); 

// Nose
addBox(37, 31, 36, 6, 3, 4, color.darkBlue);

// Ears
for(let i=0; i<12; i++) {
  addBox(29 - i*1.5, 38, 40 + i*1.2, 2, 2, 6, color.blue);
  addBox(29 - i*1.5, 37, 41 + i*1.2, 2, 1, 4, color.pink); 
}
for(let i=0; i<12; i++) {
  addBox(49 + i*1.5, 38, 40 + i*1.2, 2, 2, 6, color.blue);
  addBox(49 + i*1.5, 37, 41 + i*1.2, 2, 1, 4, color.pink); 
}

// Antennae
addBox(35, 38, 50, 1, 1, 6, color.blue);
addBox(35, 38, 56, 1, 1, 2, color.darkBlue);
addBox(44, 38, 50, 1, 1, 6, color.blue);
addBox(44, 38, 56, 1, 1, 2, color.darkBlue);

return { size, voxels, palette };
`;

const request = {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: {
    name: "execute_voxel_script",
    arguments: {
      filename: "stitch.vox",
      script: script
    }
  }
};

const mcp = spawn('node', ['index.js']);
mcp.stdout.on('data', d => console.log(d.toString()));
mcp.stderr.on('data', d => console.error(d.toString()));
mcp.stdin.write(JSON.stringify(request) + "\n");
mcp.stdin.end();
