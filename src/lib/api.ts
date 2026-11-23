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
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  newInit.headers = headers;

  const res = await fetch(input, newInit);

  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const contentType = res.headers.get('content-type') || '';

  if (urlStr.startsWith('/api') && contentType.includes('text/html')) {
    return new Response(
      JSON.stringify({ error: 'সার্ভার থেকে JSON-এর পরিবর্তে HTML রেসপন্স এসেছে। অনুগ্রহ করে পেজটি রিলোড করে আবার চেষ্টা করুন।' }),
      {
        status: 502,
        statusText: 'Invalid HTML Response for API Route',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return res;
}
