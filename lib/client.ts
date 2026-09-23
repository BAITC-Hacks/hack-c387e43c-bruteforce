export class RequestError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function request<T>(
  url: string,
  body: unknown,
  method = "POST",
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new RequestError(
      "The request could not finish. Your input is preserved. Check the connection and retry.",
    );
  }
  const result = await response.json();
  if (!response.ok)
    throw new RequestError(result.error || "Please try again.", result.fields);
  return result as T;
}
export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
