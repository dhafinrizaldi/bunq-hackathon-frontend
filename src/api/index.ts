import axios from "axios";
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE;

if (__DEV__) {
  console.log("[api] BASE_URL =", BASE_URL);
}

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10_000, // 10s — fail fast instead of spinning for minutes
});

api.interceptors.request.use((config) => {
  if (__DEV__) {
    const fullUrl = (config.baseURL ?? "") + (config.url ?? "");
    console.log("[api] →", config.method?.toUpperCase(), fullUrl);
    console.log("[api] → body:", JSON.stringify(config.data));
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log("[api] ←", response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      if (error.response) {
        console.log("[api] ✗ HTTP", error.response.status, error.config?.url);
        console.log("[api] ✗ response headers:", JSON.stringify(error.response.headers));
        console.log("[api] ✗ response body:", JSON.stringify(error.response.data));
      } else if (error.request) {
        console.log("[api] ✗ No response received");
        console.log("[api] ✗ error code:", error.code);
        console.log("[api] ✗ error message:", error.message);
        console.log("[api] ✗ full error:", JSON.stringify(error.toJSON()));
      } else {
        console.log("[api] ✗ Request setup error:", error.message);
      }
    }
    return Promise.reject(error);
  }
);


// Base instance without interceptors
const baseAPI = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
api.interceptors.response.use(
  undefined,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await baseAPI.post("accounts/token/refresh/");
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
