import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// サーバーサイド結合は廃止。クライアントサイドのCanvas+MediaRecorder方式に移行。
// このルートは互換性のために残し、クライアントに方式変更を通知。
export async function POST() {
  return NextResponse.json(
    { error: "動画結合はクライアントサイドで処理されます。ページを再読み込みしてください。" },
    { status: 410 }
  );
}
