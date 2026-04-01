import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdtemp, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const runtime = "nodejs";
export const maxDuration = 120;

const execFileAsync = promisify(execFile);

function createStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * サーバーサイド動画結合API
 * POST JSON: { episode_id: string, new_video_url: string }
 * 動画ファイルはクライアントが事前にSupabase Storageにアップロードし、
 * そのURLをこのAPIに渡す（Vercelの4.5MBボディ制限を回避）
 */
export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { episode_id: episodeId, new_video_url: newVideoUrl } = await request.json();

    if (!episodeId || !newVideoUrl) {
      return NextResponse.json(
        { error: "episode_id と new_video_url が必要です" },
        { status: 400 }
      );
    }

    // エピソード取得＋所有者確認
    const { data: episode } = await supabase
      .from("episodes")
      .select("*, drama:dramas(id, creator_id)")
      .eq("id", episodeId)
      .single();

    if (!episode) {
      return NextResponse.json(
        { error: "エピソードが見つかりません" },
        { status: 404 }
      );
    }

    if (episode.drama?.creator_id !== user.id) {
      return NextResponse.json(
        { error: "このエピソードの所有者ではありません" },
        { status: 403 }
      );
    }

    if (!episode.video_url) {
      return NextResponse.json(
        { error: "元の動画URLが見つかりません" },
        { status: 400 }
      );
    }

    // ffmpeg-static のパスを取得
    let ffmpegPath: string;
    try {
      ffmpegPath = require("ffmpeg-static");
    } catch {
      return NextResponse.json(
        { error: "ffmpegが利用できません" },
        { status: 503 }
      );
    }

    // 一時ディレクトリを作成
    tempDir = await mkdtemp(join(tmpdir(), "concat-"));
    const input1Path = join(tempDir, "input1.mp4");
    const input2Path = join(tempDir, "input2.mp4");
    const listPath = join(tempDir, "filelist.txt");
    const tsPath1 = join(tempDir, "part1.ts");
    const tsPath2 = join(tempDir, "part2.ts");
    const outputPath = join(tempDir, "output.mp4");

    // 1. 既存の動画をダウンロード
    console.log("[concat] Downloading existing video:", episode.video_url);
    const existingRes = await fetch(episode.video_url);
    if (!existingRes.ok) {
      throw new Error(`既存動画のダウンロード失敗: ${existingRes.status}`);
    }
    const existingBuf = Buffer.from(await existingRes.arrayBuffer());
    await writeFile(input1Path, existingBuf);

    // 2. 新しい動画をURLからダウンロード
    console.log("[concat] Downloading new video:", newVideoUrl);
    const newRes = await fetch(newVideoUrl);
    if (!newRes.ok) {
      throw new Error(`新動画のダウンロード失敗: ${newRes.status}`);
    }
    const newBuf = Buffer.from(await newRes.arrayBuffer());
    await writeFile(input2Path, newBuf);

    // 3. TS変換 + 結合（タイムスタンプ正規化でシーク問題を解消）
    console.log("[concat] Converting to TS format...");

    await execFileAsync(ffmpegPath, [
      "-i", input1Path,
      "-c", "copy",
      "-bsf:v", "h264_mp4toannexb",
      "-f", "mpegts",
      "-y", tsPath1,
    ]);

    await execFileAsync(ffmpegPath, [
      "-i", input2Path,
      "-c", "copy",
      "-bsf:v", "h264_mp4toannexb",
      "-f", "mpegts",
      "-y", tsPath2,
    ]);

    console.log("[concat] Concatenating...");
    await execFileAsync(ffmpegPath, [
      "-i", `concat:${tsPath1}|${tsPath2}`,
      "-c", "copy",
      "-bsf:a", "aac_adtstoasc",
      "-movflags", "+faststart",
      "-y", outputPath,
    ]);

    // 4. Duration取得
    let duration = 0;
    try {
      const { stderr } = await execFileAsync(ffmpegPath, [
        "-i", outputPath,
        "-f", "null", "-",
      ]).catch((e: any) => ({ stderr: e.stderr || "", stdout: "" }));

      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (match) {
        duration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 100;
        duration = Math.round(duration);
      }
    } catch {
      // duration取得失敗は無視
    }

    // 5. 結合した動画をSupabase Storageにアップロード
    console.log("[concat] Uploading concatenated video...");
    const outputBuf = await readFile(outputPath);
    const storagePath = `${user.id}/${episode.drama_id}_concat_${Date.now()}.mp4`;

    const storageClient = createStorageClient();
    const { error: uploadErr } = await storageClient.storage
      .from("videos")
      .upload(storagePath, outputBuf, {
        contentType: "video/mp4",
        cacheControl: "3600",
      });

    if (uploadErr) {
      throw new Error("結合動画のアップロード失敗: " + uploadErr.message);
    }

    // 6. エピソードのvideo_urlとdurationを更新
    const { data: urlData } = storageClient.storage
      .from("videos")
      .getPublicUrl(storagePath);

    const updateFields: Record<string, unknown> = {
      video_url: urlData.publicUrl,
    };
    if (duration > 0) updateFields.duration = duration;

    await storageClient
      .from("episodes")
      .update(updateFields)
      .eq("id", episodeId);

    console.log("[concat] Done! Duration:", duration, "URL:", urlData.publicUrl);

    return NextResponse.json({
      success: true,
      video_url: urlData.publicUrl,
      duration,
    });
  } catch (error: any) {
    console.error("[concat] Error:", error);
    return NextResponse.json(
      { error: error.message || "動画結合に失敗しました" },
      { status: 500 }
    );
  } finally {
    // 一時ファイルのクリーンアップ
    if (tempDir) {
      const files = [
        "input1.mp4", "input2.mp4", "part1.ts", "part2.ts",
        "filelist.txt", "output.mp4",
      ];
      for (const f of files) {
        try {
          await unlink(join(tempDir, f));
        } catch {
          // ファイルがなければ無視
        }
      }
      try {
        const { rmdir } = await import("fs/promises");
        await rmdir(tempDir);
      } catch {
        // ディレクトリ削除失敗は無視
      }
    }
  }
}
