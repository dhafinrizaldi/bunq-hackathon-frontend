import axios from "axios";
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
console.log(BASE_URL);
export const publicAPI = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
export const privateAPI = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Base instance without interceptors
const baseAPI = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
publicAPI.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Check status of response and whether the original request has been sent
    if (error.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await baseAPI.post("accounts/token/refresh/");
        return publicAPI(originalRequest);
      } catch (refreshError) {
        // Error getting new access token
        // window.location.href = "/login";ssssssssssssssssssssssssss

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
privateAPI.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check status of response and whether the original request has been sent
    if (error.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await baseAPI.post("accounts/token/refresh/");
        return privateAPI(originalRequest);
      } catch (refreshError) {
        // Error getting new access token
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    } else {
      return Promise.reject(error);
    }
  },
);
