"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { profileNameSchema, type ProfileNameInput } from "@/lib/validators/profile";
import { setProfileName } from "@/lib/actions/profile";

export function NameCaptureForm({ submitLabel = "Save name" }: { submitLabel?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileNameInput>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { full_name: "" },
  });

  async function onSubmit(data: ProfileNameInput) {
    setServerError(null);
    const result = await setProfileName(data.full_name);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.refresh();
  }

  return (
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

      {serverError && (
        <p className="text-sm font-medium text-danger" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" variant="primary" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
