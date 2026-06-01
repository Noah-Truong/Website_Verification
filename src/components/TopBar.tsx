"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "./Brand";

export function TopBar({ userName }: { userName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="hover:opacity-80 transition">
          <Brand size="md" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-panel-2 border border-line mono text-xs text-signal">
              {initials || "?"}
            </span>
            <span className="text-sm text-muted">{userName}</span>
          </div>
          <button
            onClick={logout}
            disabled={loading}
            className="mono text-xs text-muted border border-line px-3 py-2 hover:border-fail hover:text-fail transition disabled:opacity-50"
          >
            {loading ? "…" : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}
