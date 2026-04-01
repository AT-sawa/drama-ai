import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-log";

export const dynamic = "force-dynamic";

// ドラマ一覧取得（管理者用）
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const admin = createServiceRoleClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = searchParams.get("q") || "";
    const published = searchParams.get("published"); // "true" | "false" | null

    let query = admin
      .from("dramas")
      .select("*, creator:profiles(id, display_name, email)", { count: "exact" });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (published === "true") query = query.eq("is_published", true);
    if (published === "false") query = query.eq("is_published", false);

    const { data: dramas, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      dramas: dramas || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Admin dramas error:", error);
    return NextResponse.json({ error: "ドラマ取得に失敗しました" }, { status: 500 });
  }
}

// ドラマ更新（公開/非公開切り替え、削除）
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const admin = createServiceRoleClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { dramaId, updates } = body;

    if (!dramaId || !updates) {
      return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    }

    const allowedFields: Record<string, any> = {};
    if (typeof updates.is_published === "boolean") allowedFields.is_published = updates.is_published;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "更新可能なフィールドがありません" }, { status: 400 });
    }

    const { error } = await admin
      .from("dramas")
      .update(allowedFields)
      .eq("id", dramaId);

    if (error) throw error;

    await logAdminAction(admin, user.id, "update_drama", "drama", dramaId, allowedFields);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin drama update error:", error);
    return NextResponse.json({ error: "ドラマ更新に失敗しました" }, { status: 500 });
  }
}

// ドラマ削除
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const admin = createServiceRoleClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dramaId = searchParams.get("id");

    if (!dramaId) {
      return NextResponse.json({ error: "ドラマIDが必要です" }, { status: 400 });
    }

    const { error } = await admin
      .from("dramas")
      .delete()
      .eq("id", dramaId);

    if (error) throw error;

    await logAdminAction(admin, user.id, "delete_drama", "drama", dramaId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin drama delete error:", error);
    return NextResponse.json({ error: "ドラマ削除に失敗しました" }, { status: 500 });
  }
}
