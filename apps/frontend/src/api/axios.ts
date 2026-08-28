import axios from "axios";
import { encryptStorage } from "../lib/storage";

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = encryptStorage.getItem<string>("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
