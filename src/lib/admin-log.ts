import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 管理者操作の監査ログを記録
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  detail?: Record<string, unknown>
) {
  try {
    await supabase.from("admin_logs").insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId || null,
      detail: detail || null,
    });
  } catch (error) {
    // ログ記録失敗はサイレントに（本来の操作をブロックしない）
    console.error("Admin log failed:", error);
  }
}
