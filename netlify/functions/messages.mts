import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import type { Config, Context } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appState, messages } from "../../db/schema.js";

const STORE_NAME = "message-tree";
const LEGACY_KEY = "messages-v1";
const MAX_MESSAGES = 1200;

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function isAdmin(user: Awaited<ReturnType<typeof getUser>>) {
  if (!user) return false;
  const metadataRoles = Array.isArray(user.appMetadata?.roles) ? user.appMetadata.roles : [];
  return user.roles?.includes("admin") || metadataRoles.includes("admin");
}

async function importLegacyMessages() {
  const importMarker = await db.select({ key: appState.key })
    .from(appState)
    .where(eq(appState.key, "legacy_messages_imported"))
    .limit(1);
  if (importMarker.length) return;

  const legacy = (await getStore(STORE_NAME).get(LEGACY_KEY, { type: "json" })) as unknown;
  if (Array.isArray(legacy) && legacy.length) {
    const rows = legacy.slice(-MAX_MESSAGES).map((item: Record<string, unknown>) => ({
      id: clean(item.id, 100) || crypto.randomUUID(),
      author: clean(item.author, 60) || "Ẩn danh",
      message: clean(item.message, 500),
      createdAt: new Date(clean(item.createdAt, 40) || Date.now()),
    })).filter((item) => item.message && !Number.isNaN(item.createdAt.getTime()));

    if (rows.length) await db.insert(messages).values(rows).onConflictDoNothing();
  }

  await db.insert(appState).values({ key: "legacy_messages_imported", value: new Date().toISOString() }).onConflictDoNothing();
}

export default async (req: Request, context: Context) => {
  await importLegacyMessages();

  if (req.method === "GET") {
    const user = await getUser();
    const allMessages = await db.select().from(messages).orderBy(asc(messages.createdAt));
    return json({ messages: allMessages, admin: isAdmin(user) });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (clean(body.website, 100)) return json({ error: "Spam detected" }, 400);

      const message = clean(body.message, 500);
      const author = clean(body.author, 60) || "Ẩn danh";
      if (!message) return json({ error: "Message is required" }, 400);

      const [item] = await db.insert(messages).values({
        id: crypto.randomUUID(),
        author,
        message,
      }).returning();

      return json({ message: item }, 201);
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
  }

  if (req.method === "DELETE") {
    const user = await getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (!isAdmin(user)) return json({ error: "Forbidden" }, 403);

    const id = clean(context.params.id, 100);
    if (id) {
      const deleted = await db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id });
      if (!deleted.length) return json({ error: "Message not found" }, 404);
      return json({ deleted: deleted[0].id });
    }

    await db.delete(messages);
    return json({ deletedAll: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: ["/api/messages", "/api/messages/:id"],
};
