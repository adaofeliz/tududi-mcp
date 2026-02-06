#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Configuration from environment
const TUDUDI_URL = process.env.TUDUDI_URL || "http://localhost:3002";
const TUDUDI_API_TOKEN = process.env.TUDUDI_API_TOKEN;
const API_VERSION = process.env.TUDUDI_API_VERSION || "v1";
const API_BASE = `${TUDUDI_URL}/api/${API_VERSION}`;

// Priority mapping
const PRIORITY_MAP: Record<number, string> = {
  0: "low",
  1: "medium",
  2: "high",
};

// Status mapping
const STATUS_MAP: Record<number, string> = {
  0: "pending",
  1: "in_progress",
  2: "completed",
  3: "archived",
};

// Summarize a task to essential fields only
function summarizeTask(task: any): any {
  return {
    id: task.id,
    uid: task.uid,
    name: task.name,
    priority: PRIORITY_MAP[task.priority] || task.priority,
    status: STATUS_MAP[task.status] || task.status,
    due_date: task.due_date,
    project: task.Project?.name || null,
    tags: task.Tags?.map((t: any) => t.name) || [],
    today: task.today || false,
  };
}

// Summarize a project to essential fields only
function summarizeProject(project: any): any {
  return {
    id: project.id,
    uid: project.uid,
    name: project.name,
    status: project.status,
    priority: PRIORITY_MAP[project.priority] || project.priority,
    area: project.Area?.name || null,
    task_count: project.tasks?.length || project.task_count || 0,
  };
}

// Helper for API calls
async function tududiApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  if (!TUDUDI_API_TOKEN) {
    throw new Error(
      "TUDUDI_API_TOKEN environment variable is required. Generate one in tududi Settings > API Tokens"
    );
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TUDUDI_API_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tududi API error (${response.status}): ${error}`);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Create the MCP server
const server = new McpServer({
  name: "tududi",
  version: "1.0.0",
});

// ============ TASK TOOLS ============

server.tool(
  "list_tasks",
  "List tasks from tududi with optional filtering. Returns compact summaries.",
  {
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
  async ({ type, status, project_id, limit }) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (project_id) params.set("project_id", project_id.toString());

    const query = params.toString();
    const data = await tududiApi(`/tasks${query ? `?${query}` : ""}`);

    // Extract tasks array and summarize
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
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_task",
  "Get a specific task by ID or UID with full details",
  {
    id: z.string().describe("Task ID (number) or UID (string)"),
  },
  async ({ id }) => {
    const data = await tududiApi(`/task/${id}`);

    // Return more details for single task but still compact
    const task = {
      ...summarizeTask(data),
      description: data.note || null,
      created_at: data.created_at,
      completed_at: data.completed_at,
      recurrence_type: data.recurrence_type,
      subtasks: data.subtasks?.map((s: any) => ({
        id: s.id,
        name: s.name,
        status: STATUS_MAP[s.status] || s.status,
      })) || [],
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "create_task",
  "Create a new task in tududi",
  {
    name: z.string().describe("Task name"),
    description: z
      .string()
      .optional()
      .describe("Task description (Markdown supported)"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Task priority"),
    due_date: z
      .string()
      .optional()
      .describe("Due date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)"),
    project_id: z.number().optional().describe("Project ID to assign task to"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Array of tag names to attach"),
    today: z.boolean().optional().describe("Add task to today's plan"),
    recurrence_type: z
      .enum(["none", "daily", "weekly", "monthly", "yearly"])
      .optional()
      .describe("Recurring pattern"),
  },
  async ({
    name,
    description,
    priority,
    due_date,
    project_id,
    tags,
    today,
    recurrence_type,
  }) => {
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
      content: [
        {
          type: "text" as const,
          text: `Task created successfully:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "update_task",
  "Update an existing task",
  {
    id: z.string().describe("Task ID or UID to update"),
    name: z.string().optional().describe("New task name"),
    description: z.string().optional().describe("New description"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("New priority"),
    status: z
      .enum(["pending", "completed", "archived"])
      .optional()
      .describe("New status"),
    due_date: z.string().optional().describe("New due date in ISO format"),
    project_id: z.number().optional().describe("Move to different project"),
    today: z.boolean().optional().describe("Add/remove from today's plan"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Array of tag names to attach"),
  },
  async ({
    id,
    name,
    description,
    priority,
    status,
    due_date,
    project_id,
    today,
    tags,
  }) => {
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
      content: [
        {
          type: "text" as const,
          text: `Task updated:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "complete_task",
  "Mark a task as completed (toggles completion status)",
  {
    id: z.string().describe("Task ID or UID to complete"),
  },
  async ({ id }) => {
    const data = await tududiApi(`/task/${id}/toggle_completion`, {
      method: "PATCH",
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Task completion toggled:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "delete_task",
  "Delete a task",
  {
    id: z.string().describe("Task ID or UID to delete"),
  },
  async ({ id }) => {
    await tududiApi(`/task/${id}`, { method: "DELETE" });

    return {
      content: [
        {
          type: "text" as const,
          text: `Task ${id} deleted successfully`,
        },
      ],
    };
  }
);

server.tool(
  "add_subtask",
  "Add a subtask to an existing task",
  {
    parent_id: z.string().describe("Parent task ID"),
    name: z.string().describe("Subtask name"),
    priority: z.enum(["low", "medium", "high"]).optional(),
    due_date: z.string().optional(),
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
      content: [
        {
          type: "text" as const,
          text: `Subtask added:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "get_task_metrics",
  "Get task metrics and productivity statistics (counts only, no task arrays)",
  {},
  async () => {
    const data = await tududiApi("/tasks/metrics");

    // Return only the counts, not the full task arrays
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
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(metrics, null, 2),
        },
      ],
    };
  }
);

// ============ PROJECT TOOLS ============

server.tool(
  "list_projects",
  "List all projects. Returns compact summaries.",
  {
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
        {
          type: "text" as const,
          text: JSON.stringify({ count: projects.length, projects }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "create_project",
  "Create a new project",
  {
    name: z.string().describe("Project name"),
    description: z.string().optional().describe("Project description"),
    priority: z.enum(["low", "medium", "high"]).optional(),
    status: z
      .enum([
        "not_started",
        "planned",
        "in_progress",
        "waiting",
        "done",
        "cancelled",
      ])
      .optional(),
    area_id: z.number().optional().describe("Area ID to place project in"),
    due_date: z.string().optional().describe("Project due date"),
    tags: z.array(z.string()).optional().describe("Tags for the project"),
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
      content: [
        {
          type: "text" as const,
          text: `Project created:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "update_project",
  "Update a project",
  {
    uid: z.string().describe("Project UID"),
    name: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    status: z
      .enum([
        "not_started",
        "planned",
        "in_progress",
        "waiting",
        "done",
        "cancelled",
      ])
      .optional(),
    area_id: z.number().optional(),
    pin_to_sidebar: z.boolean().optional(),
  },
  async ({
    uid,
    name,
    description,
    priority,
    status,
    area_id,
    pin_to_sidebar,
  }) => {
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
      content: [
        {
          type: "text" as const,
          text: `Project updated:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }
);

// ============ INBOX TOOLS ============

server.tool(
  "list_inbox",
  "List inbox items",
  {
    limit: z.number().optional().default(20).describe("Number of items"),
    offset: z.number().optional().default(0).describe("Offset for pagination"),
  },
  async ({ limit, offset }) => {
    const params = new URLSearchParams();
    params.set("limit", (limit || 20).toString());
    params.set("offset", (offset || 0).toString());

    const data = await tududiApi(`/inbox?${params.toString()}`);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "add_to_inbox",
  "Add an item to the inbox for later processing",
  {
    content: z.string().describe("Content of the inbox item"),
    source: z.string().optional().default("mcp").describe("Source identifier"),
  },
  async ({ content, source }) => {
    const data = await tududiApi("/inbox", {
      method: "POST",
      body: JSON.stringify({ content, source: source || "mcp" }),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Added to inbox:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }
);

// ============ AREA TOOLS ============

server.tool("list_areas", "List all areas (project groupings)", {}, async () => {
  const data = await tududiApi("/areas");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

// ============ TAG TOOLS ============

server.tool("list_tags", "List all tags", {}, async () => {
  const data = await tududiApi("/tags");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

// ============ SEARCH TOOL ============

server.tool(
  "search",
  "Search across tasks, projects, and notes",
  {
    query: z.string().describe("Search query"),
  },
  async ({ query }) => {
    const data = await tududiApi(`/search?q=${encodeURIComponent(query)}`);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tududi MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
