"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { EntryShell } from "@/components/layout/EntryShell";
import { signInSchema, type SignInInput } from "@/lib/validators/auth";
import { signIn } from "@/lib/actions/auth";

function SignInContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const prefilledEmail = searchParams.get("email") ?? "";
  const signUpHref = (() => {
    const params = new URLSearchParams();
    if (nextPath) params.set("next", nextPath);
    if (prefilledEmail) params.set("email", prefilledEmail);
    const qs = params.toString();
    return qs ? `/sign-up?${qs}` : "/sign-up";
  })();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: prefilledEmail },
  });

  async function onSubmit(data: SignInInput) {
    setServerError(null);
    const result = await signIn(data.email, data.password, nextPath);
    if (result && !result.success) setServerError(result.error);
  }

  return (
    <EntryShell
      eyebrow="Welcome back"
      title="Sign in to your recipe book"
      description="Pick up where your family left off and keep the good meals easy to find."
      maxWidth="md"
      sideImageSrc="/images/entry/sign-in.jpg"
      sideImageAlt="Open recipe notebook on a kitchen counter"
      sideTitle="Pick up where your family left off."
      sideDescription="Open the cookbook, find the recipe you meant to make, and keep adding the notes that make it yours."
      sideNote="Back to the recipes everyone asks for."
      footer={
        <p className="text-center text-sm text-ink-muted mt-5">
          Don&rsquo;t have an account?{" "}
          <Link
            href={signUpHref}
            className="text-green-deep font-semibold hover:underline"
          >
            Create one
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
        <Input
          label="Password"
          required
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          rightElement={
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              className="pointer-events-auto flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-green-pale hover:text-green-deep"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
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
    </EntryShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
