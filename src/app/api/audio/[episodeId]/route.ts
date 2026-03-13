import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * エピソードの音声ファイルURLを返す
 * Storage の audio/{episodeId}/ にファイルがあればURLを返す
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { episodeId: string } }
) {
  const { episodeId } = params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // audio/{episodeId}/ にファイルがあるかチェック
  const { data: files, error } = await supabase.storage
    .from("audio")
    .list(episodeId, { limit: 1 });

  if (error || !files || files.length === 0) {
    return NextResponse.json({ audio_url: null });
  }

  const { data: urlData } = supabase.storage
    .from("audio")
    .getPublicUrl(`${episodeId}/${files[0].name}`);

  return NextResponse.json({ audio_url: urlData.publicUrl });
}
