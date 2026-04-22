import { apiClient } from "@/lib/api/client";

export const taskService = {
  async getWorkspaceTasks(
    workspaceId: string,
    params?: {
      status?: string;
      assignedTo?: string;
      mine?: boolean;
      limit?: number;
    },
  ) {
    const res = await apiClient.get(`/workspaces/${workspaceId}/tasks`, {
      params,
    });
    return res.data;
  },

  async getTasks(workspaceId: string, projectId: string) {
    const res = await apiClient.get(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
    );
    return res.data;
  },

  async getTaskById(workspaceId: string, projectId: string, taskId: string) {
    const res = await apiClient.get(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    );
    return res.data;
  },

  async createTask(
    workspaceId: string,
    projectId: string,
    payload:
      | {
          title: string;
          description?: string;
          assignedTo?: string;
          priority?: string;
          dueDate?: string | null;
        }
      | FormData,
  ) {
    const isFormData = payload instanceof FormData;

    const res = await apiClient.post(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      payload,
      isFormData
        ? {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        : undefined,
    );

    return res.data;
  },

  async updateTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    payload:
      | {
          title?: string;
          description?: string;
          status?: string;
          assignedTo?: string | null;
          priority?: string;
          dueDate?: string | null;
        }
      | FormData,
    config?: any,
  ) {
    const isFormData = payload instanceof FormData;

    const res = await apiClient.put(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      payload,
      {
        ...(isFormData
          ? {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          : {}),
        ...(config || {}),
      },
    );

    return res.data;
  },

  async deleteTask(workspaceId: string, projectId: string, taskId: string) {
    const res = await apiClient.delete(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    );
    return res.data;
  },

  async getSubTasks(workspaceId: string, projectId: string, taskId: string) {
    const res = await apiClient.get(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/subtasks`,
    );
    return res.data;
  },
};
