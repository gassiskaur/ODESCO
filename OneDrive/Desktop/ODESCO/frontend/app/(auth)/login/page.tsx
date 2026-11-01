"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/common/Button";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-offwhite px-4">
      <div className="w-full max-w-sm border border-ink p-8">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Vol. 1 &middot; Research Agent
        </p>
        <h1 className="mb-6 font-serif text-3xl font-black tracking-tighter">Sign in</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b-2 border-ink bg-transparent px-1 py-2 font-mono text-sm outline-none focus-visible:bg-[#F0F0F0]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b-2 border-ink bg-transparent px-1 py-2 font-mono text-sm outline-none focus-visible:bg-[#F0F0F0]"
            />
          </label>

          {error && <p className="font-mono text-xs text-accent">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 font-body text-sm text-neutral-600">
          New here?{" "}
          <Link href="/register" className="text-ink underline-offset-4 decoration-2 decoration-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
