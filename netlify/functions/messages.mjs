import { getStore } from "@netlify/blobs";

const STORE_NAME = "message-tree";
const KEY = "messages-v1";
const MAX_MESSAGES = 1200;

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

function clean(value, max) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

export default async (req) => {
  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    const messages = (await store.get(KEY, { type: "json" })) || [];
    return json({ messages });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    if (clean(body.website, 100)) return json({ error: "Spam detected" }, 400);

    const message = clean(body.message, 500);
    const author = clean(body.author, 60) || "Ẩn danh";

    if (!message) return json({ error: "Message is required" }, 400);

    const existing = (await store.get(KEY, { type: "json" })) || [];
    const item = {
      id: crypto.randomUUID(),
      author,
      message,
      createdAt: new Date().toISOString(),
    };

    const next = [...existing, item]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-MAX_MESSAGES);

    await store.setJSON(KEY, next);
    return json({ message: item }, 201);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
};
