/**
 * ブラウザネイティブAPIで2つの動画を結合する
 * Canvas + MediaRecorder方式（ffmpeg不要）
 *
 * CORS問題の回避:
 * - 既存動画はfetch→Blob→Blob URLに変換してからvideo要素に読み込む
 * - fetchでCORSエラーの場合は/api/proxy-video経由でフォールバック
 * - Blob URLはsame-originなのでcrossOrigin属性が不要
 */

export interface ConcatResult {
  blob: Blob;
  duration: number;
}

/**
 * URLから動画データをBlobとしてダウンロード（CORS対応）
 */
async function fetchVideoAsBlob(url: string): Promise<Blob> {
  // まず直接fetch
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      console.log("[concat] Direct fetch OK:", url.substring(0, 80));
      return await res.blob();
    }
  } catch (e) {
    console.log("[concat] Direct fetch failed, trying proxy:", (e as Error).message);
  }

  // プロキシ経由でフォールバック
  const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`動画のダウンロードに失敗しました (${res.status})`);
  }
  console.log("[concat] Proxy fetch OK");
  return await res.blob();
}

/**
 * Blobから動画要素を作成して読み込み完了を待つ
 * Blob URLを使うことでCORS問題を完全に回避
 */
function loadVideoFromBlob(blob: Blob): Promise<{ video: HTMLVideoElement; blobUrl: string }> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    // crossOrigin不要（Blob URLはsame-origin）
    video.src = blobUrl;

    const timeout = setTimeout(() => {
      reject(new Error("動画の読み込みタイムアウト（30秒）"));
    }, 30000);

    video.oncanplaythrough = () => {
      clearTimeout(timeout);
      console.log("[concat] Video loaded:", video.videoWidth, "x", video.videoHeight, "duration:", video.duration);
      resolve({ video, blobUrl });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      const code = video.error?.code;
      const msg = video.error?.message || "不明";
      console.error("[concat] Video load error: code=", code, "msg=", msg, "src=", blobUrl.substring(0, 50));
      reject(new Error(`動画の読み込みに失敗しました (code: ${code}, ${msg})`));
    };
  });
}

/**
 * Fileから動画要素を作成して読み込み完了を待つ
 */
function loadVideoFromFile(file: File): Promise<{ video: HTMLVideoElement; blobUrl: string }> {
  return loadVideoFromBlob(file);
}

/**
 * 動画をCanvasに描画しながら待つ
 */
function playVideoToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<void> {
  return new Promise((resolve, reject) => {
    video.currentTime = 0;

    let animFrameId: number;
    const drawFrame = () => {
      if (video.paused || video.ended) {
        cancelAnimationFrame(animFrameId);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      animFrameId = requestAnimationFrame(drawFrame);
    };

    video.onplay = () => {
      drawFrame();
    };

    video.onended = () => {
      cancelAnimationFrame(animFrameId);
      // 最後のフレームを描画
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve();
    };

    video.onerror = () => {
      cancelAnimationFrame(animFrameId);
      const code = video.error?.code;
      const msg = video.error?.message || "不明";
      console.error("[concat] Playback error: code=", code, "msg=", msg);
      reject(new Error(`動画の再生に失敗しました (code: ${code}, ${msg})`));
    };

    video.play().catch((e) => {
      console.error("[concat] play() rejected:", e);
      reject(new Error("動画の再生を開始できません: " + e.message));
    });
  });
}

export async function concatenateVideos(
  existingVideoUrl: string,
  newVideoFile: File,
  onProgress?: (msg: string) => void
): Promise<ConcatResult> {
  console.log("[concat] === Starting concatenation ===");
  console.log("[concat] Existing URL:", existingVideoUrl);
  console.log("[concat] New file:", newVideoFile.name, "size:", newVideoFile.size);

  const blobUrlsToRevoke: string[] = [];

  try {
    // 1. 既存動画をBlobとしてダウンロード（CORS回避）
    onProgress?.("既存の動画をダウンロード中...");
    const existingBlob = await fetchVideoAsBlob(existingVideoUrl);
    console.log("[concat] Existing video blob size:", existingBlob.size, "type:", existingBlob.type);

    // 2. 両方の動画をBlob URL経由でvideo要素に読み込み
    onProgress?.("動画を読み込み中...");
    const [result1, result2] = await Promise.all([
      loadVideoFromBlob(existingBlob),
      loadVideoFromFile(newVideoFile),
    ]);

    blobUrlsToRevoke.push(result1.blobUrl, result2.blobUrl);
    const { video: video1 } = result1;
    const { video: video2 } = result2;

    const duration1 = video1.duration;
    const duration2 = video2.duration;
    const totalDuration = duration1 + duration2;
    console.log("[concat] Duration1:", duration1.toFixed(2), "Duration2:", duration2.toFixed(2), "Total:", totalDuration.toFixed(2));

    // 3. Canvasを作成
    const width = video1.videoWidth || 1920;
    const height = video1.videoHeight || 1080;
    console.log("[concat] Canvas:", width, "x", height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 4. MediaRecorderセットアップ
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    console.log("[concat] MediaRecorder mimeType:", mimeType);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(100);

    // 5. 動画1を再生→録画
    onProgress?.("動画を結合中（1/2）...");
    console.log("[concat] Playing video 1...");
    await playVideoToCanvas(video1, canvas, ctx);
    console.log("[concat] Video 1 done");

    // 6. 動画2を再生→録画
    onProgress?.("動画を結合中（2/2）...");
    console.log("[concat] Playing video 2...");
    await playVideoToCanvas(video2, canvas, ctx);
    console.log("[concat] Video 2 done");

    // 7. 録画停止
    onProgress?.("結合を完了中...");
    const resultBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        console.log("[concat] Result: size=", blob.size, "type=", blob.type, "chunks=", chunks.length);
        resolve(blob);
      };
      recorder.stop();
    });

    console.log("[concat] === Concatenation complete ===");
    return {
      blob: resultBlob,
      duration: Math.round(totalDuration),
    };
  } catch (error) {
    console.error("[concat] === ERROR ===", error);
    throw error;
  } finally {
    // Blob URLをクリーンアップ
    for (const url of blobUrlsToRevoke) {
      try { URL.revokeObjectURL(url); } catch {}
    }
  }
}
