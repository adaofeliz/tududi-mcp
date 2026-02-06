import { API_BASE, TUDUDI_API_TOKEN, PRIORITY_MAP, STATUS_MAP } from "./config.js";

export async function tududiApi(
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

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function summarizeTask(task: any): any {
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

export function summarizeProject(project: any): any {
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
