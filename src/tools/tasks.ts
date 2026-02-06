import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tududiApi, summarizeTask } from "../api.js";
import { STATUS_MAP } from "../config.js";

export function registerTaskTools(server: McpServer) {
  server.registerTool(
    "list_tasks",
    {
      description: "List tasks from tududi with optional filtering. Returns compact summaries.",
      inputSchema: {
        type: z
          .enum(["today", "upcoming", "completed", "archived", "all"])
          .optional()
          .describe("Filter tasks by type"),
        status: z
          .enum(["pending", "completed", "archived"])
          .optional()
          .describe("Filter by task status"),
        project_id: z.number().optional().describe("Filter by project ID"),
        limit: z
          .number()
          .optional()
          .default(50)
          .describe("Max number of tasks to return (default 50)"),
      },
    },
    async ({ type, status, project_id, limit }) => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (project_id) params.set("project_id", project_id.toString());

      const query = params.toString();
      const data = await tududiApi(`/tasks${query ? `?${query}` : ""}`);

      let tasks = data.tasks || data || [];
      if (Array.isArray(tasks)) {
        tasks = tasks.slice(0, limit || 50).map(summarizeTask);
      }

      const result = {
        count: tasks.length,
        total: (data.tasks || data || []).length,
        tasks,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_task",
    {
      description: "Get a specific task by ID or UID with full details",
      inputSchema: {
        id: z.string().describe("Task ID (number) or UID (string)"),
      },
    },
    async ({ id }) => {
      const data = await tududiApi(`/task/${id}`);

      const task = {
        ...summarizeTask(data),
        description: data.note || null,
        created_at: data.created_at,
        completed_at: data.completed_at,
        recurrence_type: data.recurrence_type,
        subtasks:
          data.subtasks?.map((s: any) => ({
            id: s.id,
            name: s.name,
            status: STATUS_MAP[s.status] || s.status,
          })) || [],
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }],
      };
    }
  );

  server.registerTool(
    "create_task",
    {
      description: "Create a new task in tududi",
      inputSchema: {
        name: z.string().describe("Task name"),
        description: z.string().optional().describe("Task description (Markdown supported)"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Task priority"),
        due_date: z
          .string()
          .optional()
          .describe("Due date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)"),
        project_id: z.number().optional().describe("Project ID to assign task to"),
        tags: z.array(z.string()).optional().describe("Array of tag names to attach"),
        today: z.boolean().optional().describe("Add task to today's plan"),
        recurrence_type: z
          .enum(["none", "daily", "weekly", "monthly", "yearly"])
          .optional()
          .describe("Recurring pattern"),
      },
    },
    async ({ name, description, priority, due_date, project_id, tags, today, recurrence_type }) => {
      const body: Record<string, any> = { name };
      if (description) body.note = description;
      if (priority) body.priority = priority;
      if (due_date) body.due_date = due_date;
      if (project_id) body.project_id = project_id;
      if (tags) body.tags = tags.map((name) => ({ name }));
      if (today !== undefined) body.today = today;
      if (recurrence_type) body.recurrence_type = recurrence_type;

      const data = await tududiApi("/task", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        content: [{ type: "text" as const, text: `Task created successfully:\n${JSON.stringify(data, null, 2)}` }],
      };
    }
  );

  server.registerTool(
    "update_task",
    {
      description: "Update an existing task",
      inputSchema: {
        id: z.string().describe("Task ID or UID to update"),
        name: z.string().optional().describe("New task name"),
        description: z.string().optional().describe("New description"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("New priority"),
        status: z.enum(["pending", "completed", "archived"]).optional().describe("New status"),
        due_date: z.string().optional().describe("New due date in ISO format"),
        project_id: z.number().optional().describe("Move to different project"),
        today: z.boolean().optional().describe("Add/remove from today's plan"),
        tags: z.array(z.string()).optional().describe("Array of tag names to attach"),
      },
    },
    async ({ id, name, description, priority, status, due_date, project_id, today, tags }) => {
      const body: Record<string, any> = {};
      if (name) body.name = name;
      if (description) body.note = description;
      if (priority) body.priority = priority;
      if (status) body.status = status;
      if (due_date) body.due_date = due_date;
      if (project_id !== undefined) body.project_id = project_id;
      if (today !== undefined) body.today = today;
      if (tags) body.tags = tags.map((name) => ({ name }));

      const data = await tududiApi(`/task/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      return {
        content: [{ type: "text" as const, text: `Task updated:\n${JSON.stringify(data, null, 2)}` }],
      };
    }
  );

  server.registerTool(
    "complete_task",
    {
      description: "Mark a task as completed (toggles completion status)",
      inputSchema: {
        id: z.string().describe("Task ID or UID to complete"),
      },
    },
    async ({ id }) => {
      const data = await tududiApi(`/task/${id}/toggle_completion`, {
        method: "PATCH",
      });

      return {
        content: [{ type: "text" as const, text: `Task completion toggled:\n${JSON.stringify(data, null, 2)}` }],
      };
    }
  );

  server.registerTool(
    "delete_task",
    {
      description: "Delete a task",
      inputSchema: {
        id: z.string().describe("Task ID or UID to delete"),
      },
    },
    async ({ id }) => {
      await tududiApi(`/task/${id}`, { method: "DELETE" });

      return {
        content: [{ type: "text" as const, text: `Task ${id} deleted successfully` }],
      };
    }
  );

  server.registerTool(
    "add_subtask",
    {
      description: "Add a subtask to an existing task",
      inputSchema: {
        parent_id: z.string().describe("Parent task ID"),
        name: z.string().describe("Subtask name"),
        priority: z.enum(["low", "medium", "high"]).optional(),
        due_date: z.string().optional(),
      },
    },
    async ({ parent_id, name, priority, due_date }) => {
      const body: Record<string, any> = { name };
      if (priority) body.priority = priority;
      if (due_date) body.due_date = due_date;

      const data = await tududiApi(`/task/${parent_id}/subtasks`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        content: [{ type: "text" as const, text: `Subtask added:\n${JSON.stringify(data, null, 2)}` }],
      };
    }
  );

  server.registerTool(
    "get_task_metrics",
    {
      description: "Get task metrics and productivity statistics (counts only, no task arrays)",
    },
    async () => {
      const data = await tududiApi("/tasks/metrics");

      const metrics = {
        total_open_tasks: data.total_open_tasks,
        tasks_pending_over_month: data.tasks_pending_over_month,
        tasks_in_progress_count: data.tasks_in_progress_count,
        tasks_due_today_count: data.tasks_due_today_count,
        today_plan_tasks_count: data.today_plan_tasks_count,
        suggested_tasks_count: data.suggested_tasks_count,
        tasks_completed_today_count: data.tasks_completed_today_count,
        weekly_completions: data.weekly_completions,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(metrics, null, 2) }],
      };
    }
  );
}
