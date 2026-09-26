import { admin } from "@netlify/identity";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers,
  });

export default async (req) => {
  // Chỉ cho phép GET để bạn có thể chạy bằng trình duyệt.
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // Mật khẩu bootstrap nằm trong Netlify Environment Variables.
    const url = new URL(req.url);
    const providedKey = url.searchParams.get("key") || "";

    const bootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY || "";
    const targetEmail = (process.env.ADMIN_TARGET_EMAIL || "")
      .trim()
      .toLowerCase();

    if (!bootstrapKey) {
      return json(
        { error: "ADMIN_BOOTSTRAP_KEY chưa được cấu hình." },
        500
      );
    }

    if (!targetEmail) {
      return json(
        { error: "ADMIN_TARGET_EMAIL chưa được cấu hình." },
        500
      );
    }

    if (!providedKey || providedKey !== bootstrapKey) {
      return json({ error: "Bootstrap key không đúng." }, 401);
    }

    // Tìm user theo email.
    const users = await admin.listUsers({
      page: 1,
      perPage: 100,
    });

    const user = users.find(
      (item) => String(item.email || "").trim().toLowerCase() === targetEmail
    );

    if (!user) {
      return json(
        {
          error: "Không tìm thấy tài khoản Identity.",
          email: targetEmail,
        },
        404
      );
    }

    // Lấy roles hiện tại và giữ nguyên các role khác.
    const existingRoles = Array.isArray(user.roles)
      ? user.roles
      : Array.isArray(user.appMetadata?.roles)
      ? user.appMetadata.roles
      : [];

    const roles = [...new Set([...existingRoles, "admin"])];

    // Gán admin vào app_metadata.roles.
    const updatedUser = await admin.updateUser(user.id, {
      app_metadata: {
        ...(user.appMetadata || {}),
        roles,
      },
    });

    return json({
      success: true,
      message: "Đã gán role admin thành công.",
      email: updatedUser.email,
      roles: updatedUser.roles || roles,
      userId: updatedUser.id,
    });
  } catch (error) {
    console.error("grant-admin error:", error);

    return json(
      {
        error: "Không thể gán quyền admin.",
        detail: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
};

export const config = {
  path: "/api/grant-admin",
};
