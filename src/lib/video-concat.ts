/**
 * ブラウザ上でffmpeg.wasmを使って2つの動画を結合する
 * 元の動画の末尾にアップロードした動画を追加して1本にする
 *
 * 3本以上の結合に対応:
 * - 毎回ffmpegインスタンスを新規作成（メモリリーク防止）
 * - CORS回避のためサーバーサイドプロキシ経由で既存動画を取得
 * - 処理前後にファイルシステムを完全クリーンアップ
 */

export interface ConcatResult {
  blob: Blob;
  duration: number;
}

async function createFFmpeg(
  onProgress?: (msg: string) => void
) {
  onProgress?.("FFmpegを読み込み中...");

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
  });

  return ffmpeg;
}

/**
 * URLから動画データを取得（CORS回避対応）
 * 同一オリジンならそのまま、クロスオリジンならプロキシ経由
 */
async function fetchVideoData(
  url: string,
  onProgress?: (msg: string) => void
): Promise<Uint8Array> {
  onProgress?.("既存の動画をダウンロード中...");

  // まず直接取得を試みる
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    }
  } catch {
    // CORS失敗 → プロキシ経由
  }

  // プロキシ経由で取得
  onProgress?.("既存の動画をプロキシ経由でダウンロード中...");
  const proxyRes = await fetch(
    `/api/proxy-video?url=${encodeURIComponent(url)}`
  );
  if (!proxyRes.ok) {
    throw new Error("既存の動画のダウンロードに失敗しました");
  }
  const buf = await proxyRes.arrayBuffer();
  return new Uint8Array(buf);
}

export async function concatenateVideos(
  existingVideoUrl: string,
  newVideoFile: File,
  onProgress?: (msg: string) => void
): Promise<ConcatResult> {
  // 毎回新しいインスタンスを作成（メモリリーク防止）
  const ffmpeg = await createFFmpeg(onProgress);

  try {
    // 1. 既存の動画をダウンロード（CORS対応）
    const existingData = await fetchVideoData(existingVideoUrl, onProgress);

    // 2. 新しい動画をバッファに変換
    onProgress?.("アップロード動画を準備中...");
    const newData = new Uint8Array(await newVideoFile.arrayBuffer());

    // 3. FFmpegに入力ファイルを書き込み
    await ffmpeg.writeFile("input1.mp4", existingData);
    await ffmpeg.writeFile("input2.mp4", newData);

    // 4. 各入力をTS（MPEG-TS）に変換してタイムスタンプを正規化
    onProgress?.("動画を変換中（1/2）...");
    await ffmpeg.exec([
      "-i", "input1.mp4",
      "-c", "copy",
      "-bsf:v", "h264_mp4toannexb",
      "-f", "mpegts",
      "part1.ts",
    ]);

    // input1は不要になったので削除（メモリ解放）
    await safeDelete(ffmpeg, "input1.mp4");

    onProgress?.("動画を変換中（2/2）...");
    await ffmpeg.exec([
      "-i", "input2.mp4",
      "-c", "copy",
      "-bsf:v", "h264_mp4toannexb",
      "-f", "mpegts",
      "part2.ts",
    ]);

    // input2も不要
    await safeDelete(ffmpeg, "input2.mp4");

    // 5. TS同士をconcatプロトコルで結合し、MP4に再mux
    onProgress?.("動画を結合中...");
    await ffmpeg.exec([
      "-i", "concat:part1.ts|part2.ts",
      "-c", "copy",
      "-bsf:a", "aac_adtstoasc",
      "-movflags", "+faststart",
      "output.mp4",
    ]);

    // TSファイルを削除（メモリ解放）
    await safeDelete(ffmpeg, "part1.ts");
    await safeDelete(ffmpeg, "part2.ts");

    // 6. 結合後のdurationを取得
    onProgress?.("動画情報を取得中...");
    let duration = 0;
    try {
      const logs: string[] = [];
      const logHandler = ({ message }: { message: string }) => {
        logs.push(message);
      };
      ffmpeg.on("log", logHandler);
      await ffmpeg.exec(["-i", "output.mp4", "-f", "null", "-"]).catch(() => {});
      ffmpeg.off("log", logHandler);

      for (const log of logs) {
        const match = log.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
        if (match) {
          const h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const s = parseInt(match[3]);
          const ms = parseInt(match[4]);
          duration = h * 3600 + m * 60 + s + ms / 100;
          break;
        }
      }
    } catch {
      // duration取得失敗は無視
    }

    // 7. 出力を読み取り
    onProgress?.("結合した動画を準備中...");
    const outputData = await ffmpeg.readFile("output.mp4");
    await safeDelete(ffmpeg, "output.mp4");

    const blob = new Blob([outputData as BlobPart], { type: "video/mp4" });

    // durationが取れなかった場合のフォールバック
    if (duration === 0) {
      try {
        duration = await getBlobVideoDuration(blob);
      } catch {
        // 取得できなくても続行
      }
    }

    return { blob, duration: Math.round(duration) };
  } finally {
    // インスタンスを完全に破棄（メモリ解放）
    try {
      ffmpeg.terminate();
    } catch {
      // terminate失敗は無視
    }
  }
}

async function safeDelete(ffmpeg: any, filename: string) {
  try {
    await ffmpeg.deleteFile(filename);
  } catch {
    // ファイルが存在しない場合は無視
  }
}

/**
 * BlobからHTMLVideoElementでdurationを取得するフォールバック
 */
function getBlobVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(blob);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (isFinite(video.duration) && video.duration > 0) {
        resolve(video.duration);
      } else {
        video.currentTime = Number.MAX_SAFE_INTEGER;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          resolve(video.duration);
        };
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    };

    setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Timeout loading video metadata"));
    }, 10000);
  });
}
