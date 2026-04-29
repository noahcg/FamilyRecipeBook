"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Mail } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { signUpSchema, type SignUpInput } from "@/lib/validators/auth";
import { signUp } from "@/lib/actions/auth";

export default function SignUpPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(data: SignUpInput) {
    setServerError(null);
    const result = await signUp(data.full_name, data.email, data.password);
    if (!result) return; // redirect happened
    if (!result.success) {
      setServerError(result.error);
    } else if (result.data.needsConfirmation) {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="app-paper-bg paper-texture min-h-screen flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm text-center relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
            style={{ background: "var(--color-sage-soft)" }}
          >
            <Mail size={28} strokeWidth={1.5} className="text-green-deep" />
          </div>
          <h1
            className="text-2xl font-bold text-green-deep mb-2"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Check your email
          </h1>
          <p className="text-ink-muted text-sm leading-relaxed">
            We sent a confirmation link to your email address. Click it to
            finish setting up your account.
          </p>
          <p className="text-xs text-ink-soft mt-6">
            Already confirmed?{" "}
            <Link href="/sign-in" className="text-green-deep font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-paper-bg paper-texture min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
            style={{ background: "var(--color-sage-soft)" }}
          >
            <BookOpen size={26} strokeWidth={1.5} className="text-green-deep" />
          </div>
          <h1
            className="text-2xl font-bold text-green-deep text-center"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Create your recipe book
          </h1>
          <p className="text-sm text-ink-muted mt-1 text-center">
            A home for your family&rsquo;s recipes and memories
          </p>
        </div>

        <div className="recipe-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Your name"
              required
              type="text"
              autoComplete="name"
              placeholder="e.g. Katherine"
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <Input
              label="Email address"
              required
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              required
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
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
              Get started
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-green-deep font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
