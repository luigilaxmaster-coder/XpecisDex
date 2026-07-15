const fs = require('fs');

const configPath = process.env.APPDATA + "\\\\Claude\\\\claude_desktop_config.json";

try {
    let raw = fs.readFileSync(configPath, 'utf8');
    let config = JSON.parse(raw);
    
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    
    config.mcpServers["goxel-mcp"] = {
        "command": "node",
        "args": [
            "C:/Users/PD2/Desktop/XpecisDex/goxel-mcp/index.js"
        ],
        "env": {}
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Claude config updated successfully with goxel-mcp!");
} catch (e) {
    console.error("Error updating Claude config:", e);
}
