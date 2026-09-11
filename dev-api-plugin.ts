import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const API_ROUTES = ['books', 'laws', 'notes', 'settings', 'sync'] as const;

type ApiHandler = (req: unknown, res: unknown) => unknown | Promise<unknown>;

const readBody = (req: IncomingMessage): Promise<unknown> => new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  req.on('data', chunk => chunks.push(chunk as Buffer));
  req.on('error', reject);
  req.on('end', () => {
    if (chunks.length === 0) return resolve(undefined);
    const raw = Buffer.concat(chunks).toString('utf8');
    try {
      resolve(JSON.parse(raw));
    } catch {
      resolve(raw);
    }
  });
});

const wrapResponse = (res: ServerResponse) => Object.assign(res, {
  status(code: number) {
    res.statusCode = code;
    return this;
  },
  json(payload: unknown) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return this;
  },
  send(payload: unknown) {
    if (typeof payload === 'string' || Buffer.isBuffer(payload)) res.end(payload);
    else this.json(payload);
    return this;
  }
});

/**
 * Serves the Vercel functions in `api/` during `vite dev`, so local development
 * writes to the same Neon database as production instead of silently dropping
 * every sync request against Vite's HTML fallback.
 */
export function devApiPlugin(): Plugin {
  return {
    name: 'thai-law-mate-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        if (!rawUrl.startsWith('/api/')) return next();

        const url = new URL(rawUrl, 'http://localhost');
        const route = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
        if (!API_ROUTES.includes(route as typeof API_ROUTES[number])) return next();

        try {
          const module = await server.ssrLoadModule(`/api/${route}.ts`);
          const handler = module.default as ApiHandler | undefined;
          if (typeof handler !== 'function') throw new Error(`api/${route}.ts has no default export`);

          const request = Object.assign(req, {
            query: Object.fromEntries(url.searchParams.entries()),
            cookies: {},
            body: await readBody(req)
          });

          await handler(request, wrapResponse(res));
        } catch (error) {
          server.config.logger.error(`[dev-api] /api/${route} failed: ${error instanceof Error ? error.stack || error.message : String(error)}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Dev API error' }));
        }
      });
    }
  };
}
