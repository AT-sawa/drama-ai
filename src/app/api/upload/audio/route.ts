import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
];

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
    const episodeId = formData.get("episode_id") as string | null;

    if (!file || !episodeId) {
      return NextResponse.json(
        { error: "ファイルとepisode_idが必要です" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは20MB以下にしてください" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "対応形式: MP3, WAV, OGG, AAC, M4A" },
        { status: 400 }
      );
    }

    // エピソード所有者確認
    const { data: episode } = await supabase
      .from("episodes")
      .select("id, drama_id, dramas:drama_id(creator_id)")
      .eq("id", episodeId)
      .single();

    const creatorId = (episode as any)?.dramas?.creator_id;
    if (!episode || creatorId !== user.id) {
      return NextResponse.json(
        { error: "エピソードが見つかりません" },
        { status: 404 }
      );
    }

    const storageClient = createStorageClient();

    // 既存の音声ファイルを削除（audio/{episodeId}/ ディレクトリ内）
    const { data: existing } = await storageClient.storage
      .from("audio")
      .list(episodeId);

    if (existing && existing.length > 0) {
      const paths = existing.map((f) => `${episodeId}/${f.name}`);
      await storageClient.storage.from("audio").remove(paths);
    }

    // アップロード（パス: {episodeId}/audio.{ext}）
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${episodeId}/audio.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await storageClient.storage
      .from("audio")
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Audio upload error:", uploadError);
      return NextResponse.json(
        { error: `アップロードに失敗しました: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = storageClient.storage
      .from("audio")
      .getPublicUrl(path);

    return NextResponse.json({ audio_url: urlData.publicUrl });
  } catch (error) {
    console.error("Audio upload error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 音声ファイルの削除
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { episode_id: episodeId } = await request.json();

    if (!episodeId) {
      return NextResponse.json(
        { error: "episode_idが必要です" },
        { status: 400 }
      );
    }

    // エピソード所有者確認
    const { data: episode } = await supabase
      .from("episodes")
      .select("id, drama_id, dramas:drama_id(creator_id)")
      .eq("id", episodeId)
      .single();

    const creatorId = (episode as any)?.dramas?.creator_id;
    if (!episode || creatorId !== user.id) {
      return NextResponse.json(
        { error: "エピソードが見つかりません" },
        { status: 404 }
      );
    }

    const storageClient = createStorageClient();

    const { data: existing } = await storageClient.storage
      .from("audio")
      .list(episodeId);

    if (existing && existing.length > 0) {
      const paths = existing.map((f) => `${episodeId}/${f.name}`);
      await storageClient.storage.from("audio").remove(paths);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Audio delete error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
