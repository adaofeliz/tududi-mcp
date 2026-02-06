import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTaskTools } from "./tasks.js";
import { registerProjectTools } from "./projects.js";
import { registerInboxTools } from "./inbox.js";
import { registerMiscTools } from "./misc.js";

export function registerAllTools(server: McpServer) {
  registerTaskTools(server);
  registerProjectTools(server);
  registerInboxTools(server);
  registerMiscTools(server);
}
