const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const { generateToolsManifest } = require('./generate-tools.cjs');

// Extract tools from source files
const tools = generateToolsManifest();

const manifest = {
  manifest_version: "0.3",
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  author: {
    name: pkg.author || "adaofeliz"
  },
  
  tools: tools,
  
  server: {
    type: "node",
    entry_point: "server/index.js",
    mcp_config: {
      command: "node",
      args: ["${__dirname}/server/index.js"],
      env: {
        TUDUDI_API_TOKEN: "${user_config.TUDUDI_API_TOKEN}",
        TUDUDI_URL: "${user_config.TUDUDI_URL}"
      }
    }
  },
  
  user_config: {
    TUDUDI_API_TOKEN: {
      type: "string",
      title: "API Token",
      sensitive: true,
      required: true,
      description: "Your tududi API token"
    },
    TUDUDI_URL: {
      type: "string",
      title: "Tududi URL",
      default: "http://localhost:3002",
      description: "The URL of your tududi instance"
    }
  },
  
  compatibility: {
    platforms: ["darwin", "linux"],
    runtimes: {
      node: ">=20.0.0"
    }
  }
};

const outputPath = path.join(__dirname, '..', '.mcpb-build', 'extension', 'manifest.json');
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log('✓ Generated manifest.json v0.3');
