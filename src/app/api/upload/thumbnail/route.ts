import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

// Vercel のbodyサイズ制限を拡張
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // クリエイター確認
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_creator")
      .eq("id", user.id)
      .single();

    if (!profile?.is_creator) {
      return NextResponse.json(
        { error: "クリエイター権限が必要です" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const dramaId = formData.get("drama_id") as string | null;

    if (!file || !dramaId) {
      return NextResponse.json(
        { error: "ファイルとdrama_idが必要です" },
        { status: 400 }
      );
    }

    // バリデーション
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは5MB以下にしてください" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "対応形式: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // ドラマ所有者確認
    const { data: drama } = await supabase
      .from("dramas")
      .select("id, thumbnail_url")
      .eq("id", dramaId)
      .eq("creator_id", user.id)
      .single();

    if (!drama) {
      return NextResponse.json(
        { error: "ドラマが見つかりません" },
        { status: 404 }
      );
    }

    // service_roleでストレージ操作（RLSバイパス）
    const serviceClient = createServiceRoleClient();

    // 古いサムネイルがある場合は削除
    if (
      drama.thumbnail_url &&
      drama.thumbnail_url.includes("supabase.co/storage")
    ) {
      const oldPath = drama.thumbnail_url.split("/thumbnails/")[1];
      if (oldPath) {
        await serviceClient.storage
          .from("thumbnails")
          .remove([decodeURIComponent(oldPath)]);
      }
    }

    // アップロード
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${dramaId}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await serviceClient.storage
      .from("thumbnails")
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "アップロードに失敗しました" },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: urlData } = serviceClient.storage
      .from("thumbnails")
      .getPublicUrl(path);

    // drama の thumbnail_url を更新
    await serviceClient
      .from("dramas")
      .update({ thumbnail_url: urlData.publicUrl })
      .eq("id", dramaId);

    return NextResponse.json({ thumbnail_url: urlData.publicUrl });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
