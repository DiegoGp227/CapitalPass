// Base URL del backend
export const BaseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.3:4000";

// Test endpoint
export const Test = new URL("/api/test", BaseURL);

// Auth endpoints
export const AuthUserURL = new URL("/api/login", BaseURL);
export const SignupUserURL = new URL("/api/signup", BaseURL);

// Topics endpoints
export const TopicsURL = new URL("/api/topics", BaseURL);

export const TasksURL = new URL("/api/tasks", BaseURL);

