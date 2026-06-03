"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode = "login" }: { mode?: "login" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = {
      email: form.get("email"),
      password: form.get("password"),
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label="Work email"
        name="email"
        type="email"
        placeholder="you@nortiq.com"
        autoComplete="email"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
      />

      {error && (
        <p className="mono text-sm text-fail border border-fail/40 bg-fail/5 px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 bg-signal text-ink font-semibold py-3 text-sm tracking-wide hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Authenticating…" : "Sign in"}
      </button>
    </form>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-eyebrow">{label}</span>
      <input
        required
        {...props}
        className="bg-surface border border-line px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:border-signal transition"
      />
    </label>
  );
}
