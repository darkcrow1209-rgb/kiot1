// Standalone server: Bun + SQLite (drizzle-orm) + static frontend.
// - SQLite file at DATA_DIR/app.db (default ./data/app.db)
// - Auto-runs drizzle/*.sql migrations on first boot
// - Auto-seeds demo data when the kiosks table is empty
// - POST /api/<action>  -> validated server action, JSON response
// - GET  /files/bills/* -> generated bill PDFs
// - everything else     -> client/dist (SPA fallback to index.html)
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, normalize } from "node:path";
import * as schema from "./schema";
import { actions, seedDemo } from "./actions";

const PORT = Number(process.env.PORT ?? 3000);
const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
const PDF_DIR = join(DATA_DIR, "pdfs");
const DIST_DIR = join(process.cwd(), "client", "dist");

mkdirSync(PDF_DIR, { recursive: true });

const sqlite = new Database(join(DATA_DIR, "app.db"));
sqlite.exec("PRAGMA journal_mode = WAL;");
const db = drizzle(sqlite, { schema });

function migrate() {
  const row = sqlite.query("SELECT name FROM sqlite_master WHERE type='table' AND name='kiosks'").get();
  if (row) return;
  const files = readdirSync(join(process.cwd(), "drizzle")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = readFileSync(join(process.cwd(), "drizzle", file), "utf8");
    for (const chunk of sql.split("--> statement-breakpoint")) {
      const stmt = chunk.trim();
      if (stmt) sqlite.exec(stmt);
    }
  }
  console.log("[server] Database migrated.");
}

migrate();

const kioskCount = (sqlite.query("SELECT COUNT(*) AS c FROM kiosks").get() as { c: number }).c;
if (kioskCount === 0) {
  await seedDemo(db);
  console.log("[server] Demo data seeded.");
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
};

async function staticResponse(pathname: string): Promise<Response | null> {
  const rel = normalize(pathname === "/" ? "/index.html" : pathname);
  if (rel.includes("..")) return new Response("Not found", { status: 404 });
  const file = Bun.file(join(DIST_DIR, rel));
  if (!(await file.exists())) return null;
  return new Response(file, {
    headers: { "Content-Type": CONTENT_TYPES[extname(rel)] ?? "application/octet-stream" },
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);

    // --- RPC actions ---
    if (pathname.startsWith("/api/") && req.method === "POST") {
      const name = pathname.slice("/api/".length);
      const action = actions[name];
      if (!action) return Response.json({ ok: false, message: "Unknown action" }, { status: 404 });
      let args: unknown = {};
      try {
        args = await req.json();
      } catch {
        /* empty body -> {} */
      }
      const parsed = action.schema.safeParse(args);
      if (!parsed.success) {
        return Response.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
      }
      try {
        return Response.json(await action.handler(db, parsed.data));
      } catch (err) {
        console.error(`[server] action "${name}" failed:`, err);
        return Response.json({ ok: false, message: "Lỗi máy chủ." }, { status: 500 });
      }
    }

    // --- Generated bill PDFs ---
    if (pathname.startsWith("/files/bills/")) {
      const name = basename(pathname);
      if (!name.endsWith(".pdf") || name.includes("..")) {
        return new Response("Not found", { status: 404 });
      }
      const file = Bun.file(join(PDF_DIR, name));
      if (!(await file.exists())) return new Response("Not found", { status: 404 });
      return new Response(file, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${name}"`,
        },
      });
    }

    // --- Static frontend (SPA fallback) ---
    if (req.method === "GET" || req.method === "HEAD") {
      const hit = await staticResponse(pathname);
      if (hit) return hit;
      const fallback = Bun.file(join(DIST_DIR, "index.html"));
      if (await fallback.exists()) {
        return new Response(fallback, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      return new Response("Client chưa được build. Hãy chạy: bun run build:client", { status: 500 });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`[server] Listening on http://localhost:${PORT} (DATA_DIR=${DATA_DIR})`);
