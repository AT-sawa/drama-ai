/**
 * ブラウザネイティブAPIで2つの動画を結合する
 * Canvas + MediaRecorder方式（ffmpeg不要）
 *
 * フロー:
 * 1. 両方の動画のメタデータを読み込み
 * 2. Canvasに動画1のフレームを描画→動画2のフレームを描画
 * 3. MediaRecorderでCanvasの出力をWebMに録画
 * 4. 結果のBlobと合計durationを返す
 */

export interface ConcatResult {
  blob: Blob;
  duration: number;
}

/**
 * 動画のメタデータ（duration）を取得
 */
function getVideoDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.src = src;
    video.onloadedmetadata = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        resolve(video.duration);
      } else {
        // Infinityの場合はseekして取得
        video.currentTime = 1e10;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          resolve(video.duration);
        };
      }
    };
    video.onerror = () => reject(new Error("動画の読み込みに失敗しました"));
    setTimeout(() => reject(new Error("動画メタデータの取得タイムアウト")), 15000);
  });
}

/**
 * 動画をCanvasに描画しながらMediaRecorderで録画する
 */
function recordVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  recorder: MediaRecorder
): Promise<void> {
  return new Promise((resolve, reject) => {
    video.currentTime = 0;

    const drawFrame = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    };

    video.onplay = () => drawFrame();
    video.onended = () => resolve();
    video.onerror = () => reject(new Error("動画の再生に失敗しました"));

    video.play().catch(reject);
  });
}

/**
 * URLまたはBlobから動画要素を作成して読み込み完了を待つ
 */
function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;

    video.oncanplaythrough = () => resolve(video);
    video.onerror = () => reject(new Error("動画の読み込みに失敗しました: " + src.substring(0, 100)));
    setTimeout(() => reject(new Error("動画の読み込みタイムアウト")), 30000);
  });
}

/**
 * CORS対応のURL取得（直接アクセスできない場合はプロキシ経由）
 */
async function getCorsUrl(url: string): Promise<string> {
  try {
    // まず直接HEADリクエストで確認
    const res = await fetch(url, { method: "HEAD", mode: "cors" });
    if (res.ok) return url;
  } catch {
    // CORS失敗
  }
  // プロキシ経由
  return `/api/proxy-video?url=${encodeURIComponent(url)}`;
}

export async function concatenateVideos(
  existingVideoUrl: string,
  newVideoFile: File,
  onProgress?: (msg: string) => void
): Promise<ConcatResult> {
  console.log("[concat] Starting concatenation");
  console.log("[concat] Existing URL:", existingVideoUrl);
  console.log("[concat] New file:", newVideoFile.name, newVideoFile.size);

  // 1. 既存動画のURLをCORS対応
  onProgress?.("動画を準備中...");
  const corsUrl = await getCorsUrl(existingVideoUrl);
  console.log("[concat] CORS URL:", corsUrl);

  // 2. 新しい動画のBlob URL作成
  const newBlobUrl = URL.createObjectURL(newVideoFile);

  try {
    // 3. 両方の動画を読み込み
    onProgress?.("動画を読み込み中...");
    const [video1, video2] = await Promise.all([
      loadVideo(corsUrl),
      loadVideo(newBlobUrl),
    ]);

    const duration1 = video1.duration;
    const duration2 = video2.duration;
    const totalDuration = duration1 + duration2;
    console.log("[concat] Duration1:", duration1, "Duration2:", duration2, "Total:", totalDuration);

    // 4. Canvasを作成（動画1のサイズに合わせる）
    const width = video1.videoWidth || 1920;
    const height = video1.videoHeight || 1080;
    console.log("[concat] Canvas size:", width, "x", height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 5. MediaRecorderをセットアップ
    const stream = canvas.captureStream(30); // 30fps

    // 音声トラックがあれば追加
    // 注: crossOriginの制約で音声はキャプチャできない場合がある
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_000_000, // 5Mbps
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // 6. 録画開始
    recorder.start(100); // 100msごとにchunk

    // 7. 動画1を再生・録画
    onProgress?.("動画を結合中（1/2）...");
    await recordVideo(video1, canvas, ctx, recorder);

    // 8. 動画2を再生・録画
    onProgress?.("動画を結合中（2/2）...");
    await recordVideo(video2, canvas, ctx, recorder);

    // 9. 録画停止
    onProgress?.("結合を完了中...");
    const resultBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };
      recorder.stop();
    });

    console.log("[concat] Result blob size:", resultBlob.size, "type:", resultBlob.type);

    return {
      blob: resultBlob,
      duration: Math.round(totalDuration),
    };
  } finally {
    URL.revokeObjectURL(newBlobUrl);
  }
}
