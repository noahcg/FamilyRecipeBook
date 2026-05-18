"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { EntryShell } from "@/components/layout/EntryShell";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validators/auth";
import { requestPasswordReset } from "@/lib/actions/auth";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: prefilledEmail },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setServerError(null);
    const result = await requestPasswordReset(data.email);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setSubmittedEmail(data.email);
  }

  if (submittedEmail) {
    return (
      <EntryShell
        eyebrow="Check your email"
        title="Reset link sent"
        description="If an account exists for that email, a reset link is on its way."
        maxWidth="md"
        sideImageSrc="/images/entry/email.jpg"
        sideImageAlt="Laptop and coffee on a kitchen table"
        sideTitle="One quick click and you're back in the kitchen."
        sideDescription="The link expires soon for your security. Open the email and pick a new password to finish."
        sideNote="Almost back to the recipes."
        footer={
          <p className="text-center text-xs text-ink-soft mt-6">
            Remembered it after all?{" "}
            <Link
              href="/sign-in"
              className="text-green-deep font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        }
      >
        <div className="text-center">
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
            We sent a reset link to <strong>{submittedEmail}</strong>. Click it
            to pick a new password. The link expires soon.
          </p>
        </div>
      </EntryShell>
    );
  }

  return (
    <EntryShell
      eyebrow="Forgot password"
      title="Let's get you back in."
      description="Enter your email and we'll send a reset link. No one remembers their password — that's normal."
      maxWidth="md"
      sideImageSrc="/images/entry/sign-in.jpg"
      sideImageAlt="Open recipe notebook on a kitchen counter"
      sideTitle="Reset, then back to the cookbook."
      sideDescription="One link, one new password, and you're in. We'll never store the old one anyway."
      sideNote="The recipes are still here."
      footer={
        <p className="text-center text-sm text-ink-muted mt-5">
          Remembered it?{" "}
          <Link
            href="/sign-in"
            className="text-green-deep font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          required
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        {serverError && (
          <p className="text-sm text-danger font-medium">{serverError}</p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </EntryShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordContent />
    </Suspense>
  );
}
