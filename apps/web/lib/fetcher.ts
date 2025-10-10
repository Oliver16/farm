export async function jsonFetcher<TReturn = unknown>(
  resource: string,
  init?: RequestInit
): Promise<TReturn> {
  const res = await fetch(resource, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      (errorBody?.error?.message as string | undefined) ||
      `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return res.json() as Promise<TReturn>;
}
