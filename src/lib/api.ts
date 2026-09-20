// Helper to perform authenticated API calls with token from localStorage
export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kotbari_auth_token') : null;
  const headers: Record<string, string> = { ...customHeaders };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kotbari_auth_token') : null;
  const newInit: RequestInit = { ...init };
  
  const headers = new Headers(newInit.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  newInit.headers = headers;

  return fetch(input, newInit);
}
