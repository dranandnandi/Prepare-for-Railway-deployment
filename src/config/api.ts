// API configuration based on environment
const isDevelopment = import.meta.env.DEV;
const API_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : window.location.origin; // In production, use same origin as frontend

const SOCKET_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : window.location.origin;

export { API_URL, SOCKET_URL };
