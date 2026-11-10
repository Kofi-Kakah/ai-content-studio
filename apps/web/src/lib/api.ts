"use client";

/**
 * Typed client for the BFF proxy (`/api/v1/*`). Cookies ride along
 * automatically — the proxy attaches the real API token server-side.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiInit extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit | null;
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, body, ...rest } = init;

  const res = await fetch(`/api/v1${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
  });

  let data: unknown = null;
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string } } | null)?.error;
    throw new ApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.code);
  }

  return data as T;
}

/** Uploads a file through the BFF proxy (multipart). */
export async function uploadFile(file: File): Promise<{
  file: { id: string; name: string; url: string; mime: string; size: number };
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/v1/uploads", { method: "POST", body: form });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new ApiError(res.status, err?.error?.message ?? "Upload failed");
  }
  return res.json();
}
