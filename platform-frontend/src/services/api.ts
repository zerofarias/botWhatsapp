import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.length
    ? import.meta.env.VITE_API_URL
    : '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
