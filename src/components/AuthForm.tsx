"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body =
      mode === "register"
        ? {
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
          }
        : { email: form.get("email"), password: form.get("password") };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
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
      {mode === "register" && (
        <Field
          label="Full name"
          name="name"
          type="text"
          placeholder="Jane Developer"
          autoComplete="name"
        />
      )}
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
        placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
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
        {loading
          ? "Authenticating…"
          : mode === "register"
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-sm text-muted text-center">
        {mode === "register" ? (
          <>
            Already have access?{" "}
            <Link href="/login" className="text-signal hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link href="/register" className="text-signal hover:underline">
              Register
            </Link>
          </>
        )}
      </p>
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
