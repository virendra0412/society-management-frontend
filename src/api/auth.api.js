import client, { unwrap } from "./client";

export const authApi = {
  register: (payload) =>
    client.post("/auth/register", payload).then(unwrap),

  login: (payload) =>
    client.post("/auth/login", payload).then(unwrap),

  refreshToken: (refreshToken) =>
    client.post("/auth/refresh-token", { refreshToken }).then(unwrap),

  logout: () =>
    client.post("/auth/logout").then(unwrap),

  getMe: () =>
    client.get("/auth/me").then(unwrap),
};
