import Link from "next/link";

export function CoinBalance({ balance }: { balance: number }) {
  return (
    <Link
      href="/coins"
      className="flex items-center gap-1.5 bg-dark-card border border-dark-border rounded-full px-3 py-1.5 hover:border-coin/50 transition"
    >
      <svg
        className="w-4 h-4 text-coin"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="12" cy="12" r="10" opacity="0.2" />
        <circle cx="12" cy="12" r="8" />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontSize="10"
          fill="#0f1419"
          fontWeight="bold"
        >
          C
        </text>
      </svg>
      <span className="text-sm font-semibold text-coin">
        {balance.toLocaleString()}
      </span>
    </Link>
  );
}
