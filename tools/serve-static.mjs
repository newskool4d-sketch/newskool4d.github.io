import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".csv", "text/csv; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
]);

const parseArgs = (argv) => {
  const options = { preferredPort: 8011, fallbackThrough: 8020, root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--preferred-port") options.preferredPort = Number(argv[index += 1]);
    if (arg === "--fallback-through") options.fallbackThrough = Number(argv[index += 1]);
    if (arg === "--root") options.root = path.resolve(argv[index += 1]);
  }
  if (!Number.isInteger(options.preferredPort) || !Number.isInteger(options.fallbackThrough)) {
    throw new Error("Ports must be integers.");
  }
  if (options.fallbackThrough < options.preferredPort) {
    throw new Error("--fallback-through must be greater than or equal to --preferred-port.");
  }
  return options;
};

const rootContains = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const resolveRequestPath = (root, requestUrl) => {
  const url = new URL(requestUrl ?? "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const candidate = path.normalize(path.join(root, pathname));
  if (!rootContains(root, candidate)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return { ok: true, filePath: candidate };
};

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, headers);
  response.end(body);
};

const createStaticServer = (root) => createServer(async (request, response) => {
  const resolved = resolveRequestPath(root, request.url);
  if (!resolved.ok) {
    send(response, resolved.status, resolved.message);
    return;
  }
  try {
    const details = await stat(resolved.filePath);
    if (!details.isFile()) {
      send(response, 404, "Not Found");
      return;
    }
    const body = await readFile(resolved.filePath);
    send(response, 200, body, {
      "Content-Type": contentTypes.get(path.extname(resolved.filePath).toLowerCase()) ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
  } catch (error) {
    send(response, 404, `Not Found: ${error instanceof Error ? error.message : String(error)}`);
  }
});

const listenOn = (server, port) => new Promise((resolve, reject) => {
  const onError = (error) => {
    server.off("listening", onListening);
    reject(error);
  };
  const onListening = () => {
    server.off("error", onError);
    resolve();
  };
  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(port, "127.0.0.1");
});

const start = async ({ root, preferredPort, fallbackThrough }) => {
  for (let port = preferredPort; port <= fallbackThrough; port += 1) {
    const server = createStaticServer(root);
    try {
      await listenOn(server, port);
      return { server, port };
    } catch (error) {
      if (error?.code !== "EADDRINUSE" || port === fallbackThrough) {
        throw error;
      }
    }
  }
  throw new Error("No available port in requested range.");
};

const closeServer = (server) => new Promise((resolve) => {
  server.close(() => resolve());
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const { server, port } = await start(options);
  const url = `http://127.0.0.1:${port}/`;
  console.log(JSON.stringify({
    event: "static-server-ready",
    url,
    port,
    preferredPort: options.preferredPort,
    fallbackThrough: options.fallbackThrough,
    root: options.root,
  }));

  const shutdown = async (signal) => {
    console.log(JSON.stringify({ event: "static-server-shutdown", signal, port }));
    await closeServer(server);
    process.exit(0);
  };
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
};

main().catch((error) => {
  console.error(JSON.stringify({
    event: "static-server-error",
    message: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
