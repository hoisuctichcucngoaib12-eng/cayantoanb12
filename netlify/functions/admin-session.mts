import { getUser, login, logout } from "@netlify/identity";
import type { Config } from "@netlify/functions";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

function isAdmin(user: Awaited<ReturnType<typeof getUser>>) {
  if (!user) return false;
  const metadataRoles = Array.isArray(user.appMetadata?.roles) ? user.appMetadata.roles : [];
  return user.roles?.includes("admin") || metadataRoles.includes("admin");
}

export default async (req: Request) => {
  if (req.method === "GET") {
    const user = await getUser();
    return json({ authenticated: Boolean(user), admin: isAdmin(user) });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const email = String(body.email ?? "").trim().slice(0, 254);
      const password = String(body.password ?? "").slice(0, 200);
      if (!email || !password) return json({ error: "Vui lòng nhập email và mật khẩu." }, 400);

      const user = await login(email, password);
      if (!isAdmin(user)) {
        await logout();
        return json({ error: "Tài khoản này không có quyền quản trị." }, 403);
      }

      return json({ admin: true });
    } catch {
      return json({ error: "Email hoặc mật khẩu không đúng." }, 401);
    }
  }

  if (req.method === "DELETE") {
    await logout();
    return json({ loggedOut: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/admin/session",
};
