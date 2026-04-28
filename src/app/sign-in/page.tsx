"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { signInSchema, type SignInInput } from "@/lib/validators/auth";
import { signIn } from "@/lib/actions/auth";

export default function SignInPage() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(data: SignInInput) {
    setServerError(null);
    const result = await signIn(data.email, data.password);
    if (result && !result.success) setServerError(result.error);
  }

  return (
    <div className="app-paper-bg paper-texture min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
            style={{ background: "var(--color-sage-soft)" }}
          >
            <BookOpen size={26} strokeWidth={1.5} className="text-green-deep" />
          </div>
          <h1
            className="text-2xl font-bold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Welcome back
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Sign in to your recipe book
          </p>
        </div>

        {/* Form */}
        <div className="recipe-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            {serverError && (
              <p className="text-sm text-danger font-medium">{serverError}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">
          Don&rsquo;t have an account?{" "}
          <Link
            href="/sign-up"
            className="text-green-deep font-semibold hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
