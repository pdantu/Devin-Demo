const BASE = import.meta.env.VITE_API_URL ?? "";

export async function apiFetch(path, options) {
  return fetch(`${BASE}${path}`, options);
}
