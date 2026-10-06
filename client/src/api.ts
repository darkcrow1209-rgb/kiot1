// Typed-ish RPC client for the standalone server.
// POST /api/<action> with JSON args; the server validates with zod and
// returns the action result as JSON. Same action names as the original app.
async function callAction<T>(action: string, args: unknown): Promise<T> {
  const res = await fetch(`/api/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args ?? {}),
  });
  if (!res.ok) {
    let message = `Lỗi gọi API ${action} (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

type ActionFn = (args: any) => Promise<any>;

export const api: Record<string, ActionFn> = new Proxy(
  {},
  {
    get:
      (_target, action: string) =>
      (args: unknown) =>
        callAction(action, args),
  },
);
