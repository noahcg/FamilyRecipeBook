"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { EntryShell } from "@/components/layout/EntryShell";
import { signUpSchema, type SignUpInput } from "@/lib/validators/auth";
import { signUp } from "@/lib/actions/auth";

function SignUpContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const prefilledEmail = searchParams.get("email") ?? "";
  const signInHref = (() => {
    const params = new URLSearchParams();
    if (nextPath) params.set("next", nextPath);
    if (prefilledEmail) params.set("email", prefilledEmail);
    const qs = params.toString();
    return qs ? `/sign-in?${qs}` : "/sign-in";
  })();
  const [serverError, setServerError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: prefilledEmail },
  });

  async function onSubmit(data: SignUpInput) {
    setServerError(null);
    const result = await signUp(data.full_name, data.email, data.password, nextPath);
    if (!result) return; // redirect happened
    if (!result.success) {
      setServerError(result.error);
    } else if (result.data.needsConfirmation) {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <EntryShell
        eyebrow="Almost there"
        title="Check your email"
        description="Confirm your address to finish setting up your Home Cooked account."
        maxWidth="md"
        sideImageSrc="/images/entry/email.jpg"
        sideImageAlt="Laptop and coffee on a kitchen table"
        sideTitle="One quick confirmation, then your cookbook is ready."
        sideDescription="After confirmation, you can create a book, save the first recipe, and invite the people who should be part of it."
        sideNote="Almost ready to start cooking."
        footer={
          <p className="text-center text-xs text-ink-soft mt-6">
            Already confirmed?{" "}
            <Link href={signInHref} className="text-green-deep font-semibold hover:underline">
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
            We sent a confirmation link to your email address. Click it to
            finish setting up your account.
          </p>
        </div>
      </EntryShell>
    );
  }

  return (
    <EntryShell
      eyebrow="Start a new recipe book"
      title="Create your Home Cooked account"
      description="A warm, private place for family recipes, kitchen notes, and the stories behind them."
      maxWidth="md"
      sideImageSrc="/images/entry/start-new.jpg"
      sideImageAlt="Blank recipe cards with kitchen ingredients"
      sideTitle="Start with one recipe. Build a book over time."
      sideDescription="Capture the dish everyone asks about, then add the stories and people that make it feel like home."
      sideNote="A place for the meals worth remembering."
      footer={
        <div className="mt-5 space-y-2 text-center">
          <p className="text-sm text-ink-muted">
            Already have an account?{" "}
            <Link
              href={signInHref}
              className="text-green-deep font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
          <p className="text-xs text-ink-soft">
            By continuing you agree to our{" "}
            <Link href="/terms" className="font-semibold text-green-deep hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-green-deep hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      }
    >
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
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 8 characters"
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
          Get started
        </Button>
      </form>
    </EntryShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
