const { spawn } = require('child_process');

const script = `
const voxels = [];
const size = {x: 40, y: 40, z: 40};
const color = {
  gray: 1,
  darkGray: 2,
  lightGray: 3,
  pink: 4,
  white: 5,
  black: 6,
  peach: 7
};

const palette = [];
palette[color.gray] = {r: 128, g: 128, b: 130, a: 255};
palette[color.darkGray] = {r: 100, g: 100, b: 105, a: 255};
palette[color.lightGray] = {r: 180, g: 180, b: 180, a: 255};
palette[color.pink] = {r: 255, g: 150, b: 150, a: 255};
palette[color.white] = {r: 255, g: 255, b: 255, a: 255};
palette[color.black] = {r: 30, g: 30, b: 30, a: 255};
palette[color.peach] = {r: 255, g: 200, b: 180, a: 255};

function addBoxOriented(x0, y0, z0, dx, dy, dz, c) {
  for(let x=x0; x<x0+dx; x++) {
    for(let y=y0; y<y0+dy; y++) {
      for(let z=z0; z<z0+dz; z++) {
        // map vertical (Y) to Z, depth (Z) to Y for MagicaVoxel
        voxels.push({x: x, y: z, z: y, i: c});
      }
    }
  }
}

// Body
addBoxOriented(14, 10, 10, 12, 10, 16, color.gray);

// Stripes on back
addBoxOriented(14, 20, 12, 12, 1, 2, color.darkGray);
addBoxOriented(14, 20, 16, 12, 1, 2, color.darkGray);
addBoxOriented(14, 20, 20, 12, 1, 2, color.darkGray);

// Side stripes
addBoxOriented(13, 12, 12, 1, 6, 2, color.darkGray);
addBoxOriented(13, 12, 16, 1, 6, 2, color.darkGray);
addBoxOriented(13, 12, 20, 1, 6, 2, color.darkGray);
addBoxOriented(26, 12, 12, 1, 6, 2, color.darkGray);
addBoxOriented(26, 12, 16, 1, 6, 2, color.darkGray);
addBoxOriented(26, 12, 20, 1, 6, 2, color.darkGray);

// Legs
addBoxOriented(14, 2, 22, 3, 8, 3, color.gray);
addBoxOriented(23, 2, 22, 3, 8, 3, color.gray);
addBoxOriented(14, 2, 11, 3, 8, 3, color.gray);
addBoxOriented(23, 2, 11, 3, 8, 3, color.gray);

// Head
addBoxOriented(12, 14, 26, 16, 12, 10, color.gray);

// Stripes on head
addBoxOriented(16, 26, 28, 8, 1, 4, color.darkGray);

// Ears
addBoxOriented(13, 26, 31, 4, 3, 3, color.gray);
addBoxOriented(14, 26, 33, 2, 2, 1, color.peach); // inner
addBoxOriented(23, 26, 31, 4, 3, 3, color.gray);
addBoxOriented(24, 26, 33, 2, 2, 1, color.peach); // inner

// Snout (muzzle)
addBoxOriented(16, 14, 36, 8, 5, 2, color.lightGray);
// Nose
addBoxOriented(19, 18, 38, 2, 1, 1, color.pink);
// Teeth / lower mouth
addBoxOriented(18, 13, 36, 4, 1, 1, color.white);

// Eyes
addBoxOriented(13, 17, 36, 4, 5, 1, color.white);
addBoxOriented(14, 18, 37, 2, 3, 1, color.black); // pupil
addBoxOriented(23, 17, 36, 4, 5, 1, color.white);
addBoxOriented(24, 18, 37, 2, 3, 1, color.black); // pupil

// Tail
addBoxOriented(18, 18, 8, 4, 8, 4, color.gray);
addBoxOriented(18, 26, 7, 4, 4, 4, color.gray);
addBoxOriented(18, 30, 6, 4, 4, 4, color.gray);
addBoxOriented(18, 34, 5, 4, 4, 4, color.darkGray); // tip

return { size, voxels, palette };
`;

const request = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: "execute_voxel_script",
    arguments: {
      filename: "gato.vox",
      script: script
    }
  }
};

const mcp = spawn('node', ['index.js']);
mcp.stdout.on('data', d => console.log(d.toString()));
mcp.stderr.on('data', d => console.error(d.toString()));
mcp.stdin.write(JSON.stringify(request) + "\n");
mcp.stdin.end();
