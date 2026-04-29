"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { CheckCircle2, BookOpen, Users } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/validators/member";
import { inviteMember } from "@/lib/actions/members";

interface AddMemberFormProps {
  bookId: string;
  bookTitle?: string;
  onSuccessRedirect?: string;
  skipLabel?: string;
  skipHref?: string;
}

const ROLE_OPTIONS = [
  {
    id: "contributor" as const,
    label: "Contributor",
    description: "Can add and edit recipes, notes, and collections.",
    icon: BookOpen,
  },
  {
    id: "family" as const,
    label: "Family",
    description: "Can view, react, and add notes and memories.",
    icon: Users,
  },
];

export function AddMemberForm({
  bookId,
  bookTitle,
  onSuccessRedirect,
  skipLabel,
  skipHref,
}: AddMemberFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: "family" },
  });

  const selectedRole = useWatch({ control, name: "role" });

  async function onSubmit(data: InviteMemberInput) {
    setServerError(null);
    const result = await inviteMember(bookId, data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setInvitedEmail(data.email);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-sage-pale)" }}
        >
          <CheckCircle2 size={28} className="text-success" />
        </div>
        <div>
          <h3
            className="text-lg font-bold text-green-deep"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Invitation sent
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            We&rsquo;ll let {invitedEmail} know they&rsquo;ve been added to this book.
          </p>
        </div>
        {onSuccessRedirect && (
          <Button
            variant="primary"
            onClick={() => router.push(onSuccessRedirect)}
          >
            {skipLabel ? "Continue" : "Go to book"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Email address"
        required
        type="email"
        autoComplete="email"
        placeholder="family@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      {/* Role cards */}
      <div>
        <p className="text-sm font-semibold text-ink mb-3">
          Their role
          <span className="ml-2 rounded-sm bg-card-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-accent-cinnamon">
            Required
          </span>
        </p>
        <div className="space-y-2">
          {ROLE_OPTIONS.map(({ id, label, description, icon: Icon }) => (
            <label
              key={id}
              className={clsx(
                "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors",
                selectedRole === id
                  ? "border-green-deep"
                  : "border-line hover:border-green-sage"
              )}
              style={{ background: selectedRole === id ? "var(--color-sage-pale)" : "var(--color-paper-soft)" }}
            >
              <input
                type="radio"
                value={id}
                className="sr-only"
                {...register("role")}
                onChange={() => setValue("role", id)}
              />
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "var(--color-sage-soft)" }}
              >
                <Icon size={16} strokeWidth={1.75} className="text-green-deep" />
              </div>
              <div>
                <p className="font-semibold text-ink text-sm">{label}</p>
                <p className="text-xs text-ink-muted mt-0.5">{description}</p>
              </div>
              {selectedRole === id && (
                <CheckCircle2
                  size={18}
                  className="text-green-deep ml-auto shrink-0 mt-0.5"
                />
              )}
            </label>
          ))}
        </div>
      </div>

      {bookTitle && (
        <p
          className="text-xs text-ink-soft italic text-center"
          style={{ fontFamily: "var(--font-caveat)", fontSize: "1rem" }}
        >
          They&rsquo;ll see the recipes you&rsquo;ve already added to &ldquo;{bookTitle}&rdquo;
        </p>
      )}

      {serverError && (
        <p className="text-sm text-danger font-medium">{serverError}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={isSubmitting}
      >
        Add to this book
      </Button>

      {skipHref && (
        <Link
          href={skipHref}
          className="block text-center text-sm text-ink-soft hover:text-ink mt-2"
        >
          {skipLabel ?? "Skip"}
        </Link>
      )}
    </form>
  );
}
