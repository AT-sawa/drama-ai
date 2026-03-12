import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Vercel のbodyサイズ制限を拡張
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * ストレージ操作用の service_role クライアント
 * @supabase/ssr の createServerClient はストレージ操作に問題があるため
 * @supabase/supabase-js の createClient を直接使用
 */
function createStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    const episodeId = formData.get("episode_id") as string | null;

    if (!file || (!dramaId && !episodeId)) {
      return NextResponse.json(
        { error: "ファイルとdrama_idまたはepisode_idが必要です" },
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

    // @supabase/supabase-js で直接ストレージ操作（SSRクライアントは非対応）
    const storageClient = createStorageClient();
    let oldThumbnailUrl: string | null = null;
    let targetId: string;

    if (episodeId) {
      // エピソード所有者確認（drama経由）
      const { data: episode } = await supabase
        .from("episodes")
        .select("id, thumbnail_url, drama_id, dramas:drama_id(creator_id)")
        .eq("id", episodeId)
        .single();

      const creatorId = (episode as any)?.dramas?.creator_id;
      if (!episode || creatorId !== user.id) {
        return NextResponse.json(
          { error: "エピソードが見つかりません" },
          { status: 404 }
        );
      }
      oldThumbnailUrl = episode.thumbnail_url;
      targetId = episodeId;
    } else {
      // ドラマ所有者確認
      const { data: drama } = await supabase
        .from("dramas")
        .select("id, thumbnail_url")
        .eq("id", dramaId!)
        .eq("creator_id", user.id)
        .single();

      if (!drama) {
        return NextResponse.json(
          { error: "ドラマが見つかりません" },
          { status: 404 }
        );
      }
      oldThumbnailUrl = drama.thumbnail_url;
      targetId = dramaId!;
    }

    // 古いサムネイルがある場合は削除
    if (oldThumbnailUrl && oldThumbnailUrl.includes("supabase.co/storage")) {
      const oldPath = oldThumbnailUrl.split("/thumbnails/")[1];
      if (oldPath) {
        await storageClient.storage
          .from("thumbnails")
          .remove([decodeURIComponent(oldPath)]);
      }
    }

    // アップロード
    const ext = file.name.split(".").pop() || "jpg";
    const prefix = episodeId ? "ep" : "drama";
    const path = `${user.id}/${prefix}_${targetId}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await storageClient.storage
      .from("thumbnails")
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `アップロードに失敗しました: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: urlData } = storageClient.storage
      .from("thumbnails")
      .getPublicUrl(path);

    // thumbnail_url を更新
    const table = episodeId ? "episodes" : "dramas";
    const { error: updateError } = await storageClient
      .from(table)
      .update({ thumbnail_url: urlData.publicUrl })
      .eq("id", targetId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "サムネイルURLの保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ thumbnail_url: urlData.publicUrl });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
