"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { acceptInvitation } from "@/lib/actions/members";
import { use } from "react";

interface Props {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: Props) {
  const { token } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "accepting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setStatus("accepting");
    const result = await acceptInvitation(token);
    if (!result.success) {
      setError(result.error);
      setStatus("error");
    } else {
      setStatus("success");
      setTimeout(() => router.push("/app"), 2000);
    }
  }

  return (
    <div className="app-paper-bg paper-texture min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm relative z-10 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
          style={{ background: "var(--color-sage-soft)" }}
        >
          {status === "success" ? (
            <CheckCircle2 size={30} className="text-success" />
          ) : status === "error" ? (
            <XCircle size={30} className="text-danger" />
          ) : (
            <BookOpen size={30} strokeWidth={1.5} className="text-green-deep" />
          )}
        </div>

        {status === "success" ? (
          <>
            <h1
              className="text-2xl font-bold text-green-deep mb-2"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              You&rsquo;re in!
            </h1>
            <p className="text-ink-muted">
              Welcome to the family book. Taking you there now…
            </p>
          </>
        ) : status === "error" ? (
          <>
            <h1
              className="text-2xl font-bold text-green-deep mb-2"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Invitation not found
            </h1>
            <p className="text-ink-muted mb-6">{error}</p>
            <Link href="/sign-in">
              <Button variant="primary">Sign in</Button>
            </Link>
          </>
        ) : (
          <>
            <h1
              className="text-2xl font-bold text-green-deep mb-2"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              You&rsquo;ve been invited
            </h1>
            <p className="text-ink-muted mb-8">
              Accept your invitation to join this recipe book and see all the
              recipes and memories inside.
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={handleAccept}
              loading={status === "accepting"}
            >
              Accept invitation
            </Button>
            <Link
              href="/sign-in"
              className="block mt-3 text-sm text-ink-soft hover:text-ink"
            >
              Sign in first
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
