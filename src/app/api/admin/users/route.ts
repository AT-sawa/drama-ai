import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-log";

export const dynamic = "force-dynamic";

// ユーザー一覧取得
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

    let query = admin
      .from("profiles")
      .select("id, email, display_name, avatar_url, coin_balance, is_creator, is_admin, created_at", { count: "exact" });

    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    const { data: users, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "ユーザー取得に失敗しました" }, { status: 500 });
  }
}

// ユーザー更新（is_creator, is_admin の切り替え等）
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
    const { userId, updates } = body;

    if (!userId || !updates) {
      return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    }

    // 許可するフィールドのみ
    const allowedFields: Record<string, any> = {};
    if (typeof updates.is_creator === "boolean") allowedFields.is_creator = updates.is_creator;
    if (typeof updates.is_admin === "boolean") allowedFields.is_admin = updates.is_admin;
    if (typeof updates.coin_balance === "number") allowedFields.coin_balance = updates.coin_balance;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "更新可能なフィールドがありません" }, { status: 400 });
    }

    const { error } = await admin
      .from("profiles")
      .update(allowedFields)
      .eq("id", userId);

    if (error) throw error;

    // 監査ログ記録
    await logAdminAction(admin, user.id, "update_user", "user", userId, allowedFields);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "ユーザー更新に失敗しました" }, { status: 500 });
  }
}
