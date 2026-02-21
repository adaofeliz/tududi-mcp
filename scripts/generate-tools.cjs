const fs = require('fs');
const path = require('path');

/**
 * Extracts tool registrations from TypeScript source files
 * Matches pattern: server.registerTool("tool_name", { description: "..." }, handler)
 */
function extractTools(sourceDir) {
  const tools = [];
  const toolFiles = ['tasks.ts', 'projects.ts', 'inbox.ts', 'misc.ts'];
  
  // Regex to match: server.registerTool("name", { description: "desc" }, ...)
  // Handles multi-line descriptions
  const toolPattern = /server\.registerTool\(\s*["']([^"']+)["']\s*,\s*\{\s*description:\s*["']([^"']+)["']/gs;
  
  for (const file of toolFiles) {
    const filePath = path.join(sourceDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ Warning: Tool file not found: ${filePath}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find all tool registrations in this file
    let match;
    while ((match = toolPattern.exec(content)) !== null) {
      const [, name, description] = match;
      tools.push({
        name: name.trim(),
        description: description.trim()
      });
    }
  }
  
  return tools;
}

function generateToolsManifest() {
  const toolsDir = path.join(__dirname, '..', 'src', 'tools');
  
  console.log('Extracting tools from source files...');
  const tools = extractTools(toolsDir);
  
  if (tools.length === 0) {
    console.error('✗ No tools found! Check source files and regex pattern.');
    process.exit(1);
  }
  
  console.log(`✓ Found ${tools.length} tools:`);
  tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description.substring(0, 50)}...`);
  });
  
  return tools;
}

module.exports = { generateToolsManifest };

// Allow running standalone for testing
if (require.main === module) {
  const tools = generateToolsManifest();
  console.log('\n' + JSON.stringify(tools, null, 2));
}
