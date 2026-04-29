type JsonValue = unknown;

const json = (body: JsonValue, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });

const readonlyRoutes = new Set(["/", "/health"]);

export const createBffHandler = () => (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method !== "GET") {
    if (readonlyRoutes.has(path)) {
      return json(
        {
          error: "method_not_allowed",
          message: "The BFF only supports GET for read endpoints.",
        },
        { status: 405, headers: { allow: "GET" } },
      );
    }

    return notFound(path);
  }

  switch (path) {
    case "/":
      return json({ service: "flovia-bff", status: "ok" });
    case "/health":
      return json({ status: "ok", service: "flovia-bff" });
    default:
      return notFound(path);
  }
};

const notFound = (path: string) =>
  json({ error: "not_found", message: `Route not found: ${path}` }, { status: 404 });
