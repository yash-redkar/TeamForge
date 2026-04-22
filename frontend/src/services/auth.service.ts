import { apiClient } from "@/lib/api/client";

export const authService = {
  async getCurrentUser() {
    const res = await apiClient.get("/auth/current-user");
    return res.data;
  },

  async logout() {
    const res = await apiClient.post("/auth/logout");
    return res.data;
  },

  async changePassword(payload: { oldPassword?: string; newPassword: string }) {
    const res = await apiClient.post("/auth/change-password", payload);
    return res.data;
  },

  async updateAccount(payload: { fullName?: string; username?: string }) {
    const res = await apiClient.patch("/auth/update-account", payload);
    return res.data;
  },

  async resendEmailVerification() {
    const res = await apiClient.post("/auth/resend-email-verification");
    return res.data;
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await apiClient.post("/auth/avatar", formData);

    return res.data;
  },
};
