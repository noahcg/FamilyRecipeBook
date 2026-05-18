"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { EntryShell } from "@/components/layout/EntryShell";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validators/auth";
import { updatePassword } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordInput) {
    setServerError(null);
    const result = await updatePassword(data.password);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <EntryShell
      eyebrow="Reset password"
      title="Pick a new password"
      description="Choose something at least 8 characters long. We'll sign you in once it's set."
      maxWidth="md"
      sideImageSrc="/images/entry/sign-in.jpg"
      sideImageAlt="Open recipe notebook on a kitchen counter"
      sideTitle="Back to the recipes in one step."
      sideDescription="Pick a new password and we'll get you signed in to your cookbook."
      sideNote="The recipes are still where you left them."
      footer={
        <p className="text-center text-sm text-ink-muted mt-5">
          Reset link not working?{" "}
          <Link
            href="/forgot-password"
            className="text-green-deep font-semibold hover:underline"
          >
            Request a new one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New password"
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
        <Input
          label="Confirm new password"
          required
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Type it again"
          error={errors.confirm?.message}
          {...register("confirm")}
        />

        {serverError && (
          <p className="text-sm text-danger font-medium">{serverError}</p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </EntryShell>
  );
}
