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
    // 他のリクエストがロード中の場合は待機
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

    // CDNからwasmファイルをロード
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

export async function concatenateVideos(
  existingVideoUrl: string,
  newVideoFile: File,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg(onProgress);
  const { fetchFile } = await import("@ffmpeg/util");

  // 1. 既存の動画をダウンロード
  onProgress?.("既存の動画をダウンロード中...");
  const existingData = await fetchFile(existingVideoUrl);

  // 2. 新しい動画をバッファに変換
  onProgress?.("アップロード動画を準備中...");
  const newData = new Uint8Array(await newVideoFile.arrayBuffer());

  // 3. FFmpegに入力ファイルを書き込み
  onProgress?.("動画を結合中...");
  await ffmpeg.writeFile("input1.mp4", existingData);
  await ffmpeg.writeFile("input2.mp4", newData);

  // 4. concat用のリストファイルを作成
  const concatList = "file 'input1.mp4'\nfile 'input2.mp4'\n";
  await ffmpeg.writeFile(
    "filelist.txt",
    new TextEncoder().encode(concatList)
  );

  // 5. 結合実行（再エンコードなしのconcat demuxer）
  await ffmpeg.exec([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "filelist.txt",
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    "output.mp4",
  ]);

  // 6. 出力を読み取り
  onProgress?.("結合した動画を準備中...");
  const outputData = await ffmpeg.readFile("output.mp4");

  // クリーンアップ
  await ffmpeg.deleteFile("input1.mp4");
  await ffmpeg.deleteFile("input2.mp4");
  await ffmpeg.deleteFile("filelist.txt");
  await ffmpeg.deleteFile("output.mp4");

  return new Blob([outputData], { type: "video/mp4" });
}
