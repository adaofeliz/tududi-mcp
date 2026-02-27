import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tududiApi } from "../api.js";

export function registerInboxTools(server: McpServer) {
  server.registerTool(
    "list_inbox",
    {
      description: "List inbox items",
      inputSchema: {
        limit: z.number().optional().default(20).describe("Number of items"),
        offset: z.number().optional().default(0).describe("Offset for pagination"),
      },
    },
    async ({ limit, offset }) => {
      const params = new URLSearchParams();
      params.set("limit", (limit || 20).toString());
      params.set("offset", (offset || 0).toString());

      const data = await tududiApi(`/inbox?${params.toString()}`);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  server.registerTool(
    "add_to_inbox",
    {
      description: "Add an item to the inbox for later processing",
      inputSchema: {
        content: z.string().describe("Content of the inbox item"),
        source: z.string().optional().default("mcp").describe("Source identifier"),
      },
    },
    async ({ content, source }) => {
      const data = await tududiApi("/inbox", {
        method: "POST",
        body: JSON.stringify({ content, source: source || "mcp" }),
      });

      return {
        content: [{ type: "text" as const, text: `Added to inbox:\n${JSON.stringify(data, null, 2)}` }],
      };
    }
  );

  server.registerTool(
    "delete_from_inbox",
    {
      description: "Delete an inbox item by its UID (e.g. after it has been processed).",
      inputSchema: {
        uid: z.string().describe("Inbox item UID to delete"),
      },
    },
    async ({ uid }) => {
      const data = await tududiApi(`/inbox/${uid}`, { method: "DELETE" });
      return {
        content: [{ type: "text" as const, text: data != null ? JSON.stringify(data, null, 2) : "Inbox item deleted." }],
      };
    }
  );
}
