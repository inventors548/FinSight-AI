import axios from "axios";

// Centralized API configuration
const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 15000
});

// Attach JWT token automatically to protected API requests and prevent stale GET cache
API.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("finsight_token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Prevent browser from returning stale cached responses for GET requests
    if (config.method?.toLowerCase() === "get") {
      config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      config.headers["Pragma"] = "no-cache";
      config.headers["Expires"] = "0";

      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }

    // Allow Axios to set the multipart boundary automatically
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Centralized response error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        "API Error:",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error("Backend server is not responding.");
    } else {
      console.error("Request configuration error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default API;
