"use client";

interface Props {
  videoUrl: string | null;
  cloudflareVideoId: string | null;
  title: string;
}

export function VideoPlayer({ videoUrl, cloudflareVideoId, title }: Props) {
  if (cloudflareVideoId) {
    return (
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          src={`https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_CODE}.cloudflarestream.com/${cloudflareVideoId}/iframe`}
          className="w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  if (videoUrl) {
    return (
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <video
          src={videoUrl}
          controls
          className="w-full h-full"
          title={title}
        >
          お使いのブラウザは動画再生に対応していません。
        </video>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-dark-card border border-dark-border rounded-xl flex items-center justify-center">
      <div className="text-center text-dark-muted">
        <svg
          className="w-16 h-16 mx-auto mb-3 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p>動画が準備中です</p>
      </div>
    </div>
  );
}
