/**
 * API route testing utilities for Next.js App Router handlers
 */

/**
 * Create a Request object for testing route handlers
 */
export function createRequest(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  }
): Request {
  const url = new URL(path, 'http://localhost:3000');

  if (options?.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return new Request(url.toString(), {
    method: options?.method || 'GET',
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
}

/**
 * Create params object for dynamic route segments (Next.js App Router)
 * Next.js 15+ uses Promise-based params
 */
export function createParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

/**
 * Parse a Response object into a structured result
 */
export async function parseResponse<T = unknown>(response: Response): Promise<{
  status: number;
  body: T;
  headers: Record<string, string>;
}> {
  const body = await response.json() as T;
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return { status: response.status, body, headers };
}
