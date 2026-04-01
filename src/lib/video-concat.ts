/**
 * ブラウザ上でffmpeg.wasmを使って2つの動画を結合する
 * 元の動画の末尾にアップロードした動画を追加して1本にする
 */

let ffmpegInstance: any = null;
let ffmpegLoading = false;

export async function loadFFmpeg(
  onProgress?: (msg: string) => void
): Promise<any> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading) {
    while (ffmpegLoading) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return ffmpegInstance;
  }

  ffmpegLoading = true;
  onProgress?.("FFmpegを読み込み中...");

  try {
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

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } finally {
    ffmpegLoading = false;
  }
}

export interface ConcatResult {
  blob: Blob;
  duration: number; // 結合後の総秒数
}

export async function concatenateVideos(
  existingVideoUrl: string,
  newVideoFile: File,
  onProgress?: (msg: string) => void
): Promise<ConcatResult> {
  const ffmpeg = await loadFFmpeg(onProgress);
  const { fetchFile } = await import("@ffmpeg/util");

  // 1. 既存の動画をダウンロード
  onProgress?.("既存の動画をダウンロード中...");
  const existingData = await fetchFile(existingVideoUrl);

  // 2. 新しい動画をバッファに変換
  onProgress?.("アップロード動画を準備中...");
  const newData = new Uint8Array(await newVideoFile.arrayBuffer());

  // 3. FFmpegに入力ファイルを書き込み
  await ffmpeg.writeFile("input1.mp4", existingData);
  await ffmpeg.writeFile("input2.mp4", newData);

  // 4. 各入力をTS（MPEG-TS）に変換してタイムスタンプを正規化
  //    これによりコーデックやタイムスタンプの差異を吸収し、シークが正常に動作する
  onProgress?.("動画を変換中（1/2）...");
  await ffmpeg.exec([
    "-i", "input1.mp4",
    "-c", "copy",
    "-bsf:v", "h264_mp4toannexb",
    "-f", "mpegts",
    "part1.ts",
  ]);

  onProgress?.("動画を変換中（2/2）...");
  await ffmpeg.exec([
    "-i", "input2.mp4",
    "-c", "copy",
    "-bsf:v", "h264_mp4toannexb",
    "-f", "mpegts",
    "part2.ts",
  ]);

  // 5. TS同士をconcatプロトコルで結合し、MP4に再mux
  onProgress?.("動画を結合中...");
  await ffmpeg.exec([
    "-i", "concat:part1.ts|part2.ts",
    "-c", "copy",
    "-bsf:a", "aac_adtstoasc",
    "-movflags", "+faststart",
    "output.mp4",
  ]);

  // 6. 結合後のdurationを取得
  onProgress?.("動画情報を取得中...");
  let duration = 0;
  try {
    // ffprobeでduration取得（ffmpeg.wasmではffprobeがないのでffmpegの-iオプションで情報取得）
    // stderrからDuration情報をキャプチャ
    const logs: string[] = [];
    const logHandler = ({ message }: { message: string }) => {
      logs.push(message);
    };
    ffmpeg.on("log", logHandler);

    await ffmpeg.exec(["-i", "output.mp4", "-f", "null", "-"]).catch(() => {
      // -f null は正常終了しないことがあるので無視
    });

    ffmpeg.off("log", logHandler);

    // "Duration: HH:MM:SS.mm" のパターンをログから探す
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
    // duration取得に失敗しても結合自体は成功しているので続行
  }

  // 7. 出力を読み取り
  onProgress?.("結合した動画を準備中...");
  const outputData = await ffmpeg.readFile("output.mp4");

  // クリーンアップ
  const filesToClean = [
    "input1.mp4", "input2.mp4", "part1.ts", "part2.ts", "output.mp4",
  ];
  for (const f of filesToClean) {
    try {
      await ffmpeg.deleteFile(f);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }

  const blob = new Blob([outputData], { type: "video/mp4" });

  // durationがffmpegから取れなかった場合、Blobサイズから推定せずにブラウザで取得
  if (duration === 0) {
    try {
      duration = await getBlobVideoDuration(blob);
    } catch {
      // 取得できなくても続行
    }
  }

  return { blob, duration: Math.round(duration) };
}

/**
 * BlobのHTMLVideoElementからdurationを取得するフォールバック
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
        // Infinity対策：seekして実際のdurationを取得
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

    // タイムアウト
    setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Timeout loading video metadata"));
    }, 10000);
  });
}
