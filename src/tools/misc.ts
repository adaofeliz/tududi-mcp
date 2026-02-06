import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tududiApi } from "../api.js";

export function registerMiscTools(server: McpServer) {
  server.registerTool(
    "list_areas",
    {
      description: "List all areas (project groupings)",
    },
    async () => {
      const data = await tududiApi("/areas");

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  server.registerTool(
    "list_tags",
    {
      description: "List all tags",
    },
    async () => {
      const data = await tududiApi("/tags");

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  server.registerTool(
    "search",
    {
      description: "Search across tasks, projects, and notes",
      inputSchema: {
        query: z.string().describe("Search query"),
      },
    },
    async ({ query }) => {
      const data = await tududiApi(`/search?q=${encodeURIComponent(query)}`);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
