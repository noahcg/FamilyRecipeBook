"use client";

import Link from "next/link";
import { Suspense, useCallback, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/components/ui";
import { EntryShell } from "@/components/layout/EntryShell";
import { createClient } from "@/lib/supabase/client";
import { OTP_MAX_LENGTH, OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/otp";
import {
  emailEntrySchema,
  otpCodeSchema,
  type EmailEntryInput,
  type OtpCodeInput,
} from "@/lib/validators/auth";
import { requestEmailOtp, verifyEmailOtp } from "@/lib/actions/auth";

/**
 * The cooldown is keyed by address and survives a reload, because the code
 * step is exactly where people switch to their mail app and come back to a
 * reloaded tab. Without this they'd see a fresh 0s timer, tap resend, and hit
 * a server 429 for no reason.
 */
const COOLDOWN_CHANGED = "hc:otp-cooldown";

function cooldownKey(email: string) {
  return `hc:otp-sent:${email.toLowerCase()}`;
}

function readRemainingCooldown(email: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(cooldownKey(email));
  if (!raw) return 0;
  const elapsed = (Date.now() - Number(raw)) / 1000;
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.max(0, Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed));
}

function markCodeSent(email: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(cooldownKey(email), String(Date.now()));
  window.dispatchEvent(new Event(COOLDOWN_CHANGED));
}

function clearCooldown(email: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(cooldownKey(email));
  window.dispatchEvent(new Event(COOLDOWN_CHANGED));
}

/**
 * The countdown is derived from sessionStorage and the wall clock rather than
 * held in state: the server snapshot is 0, so there is nothing to mismatch on
 * hydration, and a reloaded tab picks the timer back up mid-count.
 */
function subscribeToCooldown(onChange: () => void) {
  const timer = setInterval(onChange, 1000);
  window.addEventListener(COOLDOWN_CHANGED, onChange);
  return () => {
    clearInterval(timer);
    window.removeEventListener(COOLDOWN_CHANGED, onChange);
  };
}

const OAUTH_ERRORS: Record<string, string> = {
  oauth_cancelled: "Google sign-in was cancelled.",
  oauth: "We couldn't finish signing you in with Google. Try a code instead.",
};

function EmailStep({
  nextPath,
  initialEmail,
  oauthError,
}: {
  nextPath: string | null;
  initialEmail: string;
  oauthError: string | null;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(oauthError);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailEntryInput>({
    resolver: zodResolver(emailEntrySchema),
    defaultValues: { email: initialEmail },
  });

  async function onSubmit(data: EmailEntryInput) {
    setServerError(null);
    const result = await requestEmailOtp(data.email, nextPath);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    markCodeSent(data.email);
    const params = new URLSearchParams({ email: data.email, sent: "1" });
    if (nextPath) params.set("next", nextPath);
    router.push(`/sign-in?${params.toString()}`);
  }

  async function onGoogle() {
    setServerError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    // `redirectTo` is the only thing Supabase preserves across the round trip,
    // so `next` rides along inside it.
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", nextPath ?? "/app");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (error) {
      setGoogleLoading(false);
      setServerError("We couldn't reach Google just now. Try a code instead.");
    }
    // On success the browser navigates away; leave the button spinning.
  }

  return (
    <EntryShell
      eyebrow="Welcome"
      title="Sign in to Home Cooked"
      description="Enter your email and we'll send you a sign-in code. No password to remember."
      maxWidth="md"
      sideImageSrc="/images/entry/sign-in.jpg"
      sideImageAlt="Open recipe notebook on a kitchen counter"
      sideTitle="Pick up where your family left off."
      sideDescription="Open the cookbook, find the recipe you meant to make, and keep adding the notes that make it yours."
      sideNote="Back to the recipes everyone asks for."
      footer={
        <p className="mt-5 text-center text-sm text-ink-muted">
          New here? Same box &mdash; we&rsquo;ll set you up automatically.
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          required
          type="email"
          autoComplete="email"
          enterKeyHint="go"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        {serverError && (
          <p className="text-sm font-medium text-danger" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Email me a code
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line-soft" />
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink-soft">or</span>
        <span className="h-px flex-1 bg-line-soft" />
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        loading={googleLoading}
        onClick={onGoogle}
      >
        {!googleLoading && <GoogleMark />}
        Continue with Google
      </Button>
    </EntryShell>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function CodeStep({ email, nextPath }: { email: string; nextPath: string | null }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const cooldown = useSyncExternalStore(
    subscribeToCooldown,
    useCallback(() => readRemainingCooldown(email), [email]),
    () => 0
  );

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<OtpCodeInput>({
    resolver: zodResolver(otpCodeSchema),
    defaultValues: { code: "" },
  });

  const resend = useCallback(async () => {
    setServerError(null);
    setResending(true);
    const result = await requestEmailOtp(email, nextPath);
    setResending(false);
    if (!result.success) {
      setServerError(result.error);
      // The server refused because a code went out recently; show that as a
      // countdown so the button stops inviting taps that cannot work.
      if (result.rateLimited) markCodeSent(email);
      return;
    }
    markCodeSent(email);
    reset({ code: "" });
    setFocus("code");
  }, [email, nextPath, reset, setFocus]);

  async function onSubmit(data: OtpCodeInput) {
    setServerError(null);
    const result = await verifyEmailOtp(email, data.code, nextPath);
    if (!result) return; // redirect happened
    if (result.success) return;
    setServerError(result.error);
    if (result.expired) {
      // A fresh code is the only way forward, so clear the field and let them
      // ask for one immediately.
      reset({ code: "" });
      clearCooldown(email);
    }
    setFocus("code");
  }

  const backHref = nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in";

  return (
    <EntryShell
      eyebrow="Check your email"
      title="Enter your code"
      description={`We sent a sign-in code to ${email}. It expires in 10 minutes.`}
      maxWidth="md"
      sideImageSrc="/images/entry/email.jpg"
      sideImageAlt="Laptop and coffee on a kitchen table"
      sideTitle="One quick code, then your cookbook is ready."
      sideDescription="Type the code from your email and you're in. No password to set up or remember."
      sideNote="Almost ready to start cooking."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="otp-code"
          label="Sign-in code"
          required
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={OTP_MAX_LENGTH}
          enterKeyHint="go"
          autoFocus
          className="text-center font-mono text-2xl tracking-[0.3em]"
          error={errors.code?.message}
          {...register("code")}
        />

        {serverError && (
          <p className="text-sm font-medium text-danger" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0 || resending}
          className="text-sm font-semibold text-green-deep transition hover:underline disabled:cursor-not-allowed disabled:text-ink-soft disabled:no-underline"
        >
          {resending
            ? "Sending…"
            : cooldown > 0
              ? `Resend code (${cooldown}s)`
              : "Resend code"}
        </button>
        <Link href={backHref} className="text-sm font-semibold text-green-deep hover:underline">
          Use a different email
        </Link>
      </div>
    </EntryShell>
  );
}

function SignInContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const email = searchParams.get("email") ?? "";
  const sent = searchParams.get("sent") === "1";
  const oauthError = OAUTH_ERRORS[searchParams.get("error") ?? ""] ?? null;

  if (sent && email) {
    return <CodeStep key={email} email={email} nextPath={nextPath} />;
  }

  return <EmailStep nextPath={nextPath} initialEmail={email} oauthError={oauthError} />;
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
