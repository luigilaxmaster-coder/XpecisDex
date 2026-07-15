import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import writeVox from "vox-saver";
import vm from "vm";

// Inicializamos el servidor MCP
const server = new McpServer({
  name: "Goxel MCP",
  version: "1.0.0",
});

// Registramos la herramienta principal
server.tool(
  "execute_voxel_script",
  "Generates a .vox file by executing a Javascript script that returns a voxel object. The script MUST return an object with { size: {x, y, z}, voxels: [{x, y, z, i}] }. 'i' is the color index 1-255. The script runs in a sandbox. Use standard JS math and loops.",
  {
    filename: z.string().describe("Name of the file to save, e.g., 'tree.vox'"),
    script: z.string().describe("Javascript code that ends with: `return { size: {x:20, y:20, z:20}, voxels: [...] };`"),
  },
  async (args) => {
    try {
      const sandbox = { Math: Math, console: console };
      vm.createContext(sandbox);
      
      // Envolvemos el código en una función para capturar el valor de retorno
      const code = `(function() { ${args.script} })()`;
      const result = vm.runInContext(code, sandbox);
      
      if (!result || !result.size || !result.voxels) {
         return {
            content: [{ type: "text", text: "Error: Script must return an object with 'size' and 'voxels' arrays." }],
            isError: true
         };
      }
      
      const vox = {
          size: result.size,
          xyzi: {
              numVoxels: result.voxels.length,
              values: result.voxels
          },
          rgba: {
              values: Array.from({length: 256}).map(() => ({r: 255, g: 255, b: 255, a: 255}))
          }
      };
      
      // Si el script también nos pasa una paleta personalizada de colores
      if (result.palette && result.palette.length <= 256) {
          result.palette.forEach((c, i) => {
              if (i < 256) {
                 vox.rgba.values[i] = {r: c.r||255, g: c.g||255, b: c.b||255, a: c.a||255};
              }
          });
      }
      
      // Guardar el archivo usando la librería vox-saver
      const writtenVox = writeVox(vox);
      const outputDir = path.join(process.cwd(), "modelos_generados");
      
      // Crear carpeta si no existe
      if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, args.filename);
      fs.writeFileSync(outputPath, Buffer.from(writtenVox));
      
      return {
        content: [{ type: "text", text: `Success! Voxel model saved to: ${outputPath}. You can now open this file in Goxel.` }]
      };
      
    } catch (err) {
      return {
         content: [{ type: "text", text: `Script execution error: ${err.message}` }],
         isError: true
      };
    }
  }
);

// Iniciar servidor usando transporte Stdio (estándar de MCP)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Goxel MCP Server is running...");
}

main().catch(console.error);
