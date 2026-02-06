import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tududiApi, summarizeProject } from "../api.js";

export function registerProjectTools(server: McpServer) {
  server.registerTool(
    "list_projects",
    {
      description: "List all projects. Returns compact summaries.",
      inputSchema: {
        status: z
          .enum([
            "not_started",
            "planned",
            "in_progress",
            "waiting",
            "done",
            "cancelled",
            "all",
            "not_completed",
          ])
          .optional()
          .describe("Filter by project status"),
        area_id: z.number().optional().describe("Filter by area ID"),
        limit: z.number().optional().default(30).describe("Max projects to return"),
      },
    },
    async ({ status, area_id, limit }) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (area_id) params.set("area_id", area_id.toString());

      const query = params.toString();
      const data = await tududiApi(`/projects${query ? `?${query}` : ""}`);

      let projects = Array.isArray(data) ? data : data.projects || [];
      projects = projects.slice(0, limit || 30).map(summarizeProject);

      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ count: projects.length, projects }, null, 2) },
        ],
      };
    }
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a new project",
      inputSchema: {
        name: z.string().describe("Project name"),
        description: z.string().optional().describe("Project description"),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z
          .enum(["not_started", "planned", "in_progress", "waiting", "done", "cancelled"])
          .optional(),
        area_id: z.number().optional().describe("Area ID to place project in"),
        due_date: z.string().optional().describe("Project due date"),
        tags: z.array(z.string()).optional().describe("Tags for the project"),
      },
    },
    async ({ name, description, priority, status, area_id, due_date, tags }) => {
      const body: Record<string, any> = { name };
      if (description) body.description = description;
      if (priority) body.priority = priority;
      if (status) body.status = status;
      if (area_id) body.area_id = area_id;
      if (due_date) body.due_date_at = due_date;
      if (tags) body.tags = tags;

      const data = await tududiApi("/project", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        content: [{ type: "text" as const, text: `Project created:\n${JSON.stringify(data, null, 2)}` }],
      };
    }
  );

  server.registerTool(
    "update_project",
    {
      description: "Update a project",
      inputSchema: {
        uid: z.string().describe("Project UID"),
        name: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z
          .enum(["not_started", "planned", "in_progress", "waiting", "done", "cancelled"])
          .optional(),
        area_id: z.number().optional(),
        pin_to_sidebar: z.boolean().optional(),
      },
    },
    async ({ uid, name, description, priority, status, area_id, pin_to_sidebar }) => {
      const body: Record<string, any> = {};
      if (name) body.name = name;
      if (description) body.description = description;
      if (priority) body.priority = priority;
      if (status) body.status = status;
      if (area_id !== undefined) body.area_id = area_id;
      if (pin_to_sidebar !== undefined) body.pin_to_sidebar = pin_to_sidebar;

      const data = await tududiApi(`/project/${uid}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      return {
        content: [{ type: "text" as const, text: `Project updated:\n${JSON.stringify(data, null, 2)}` }],
      };
    }
  );
}
