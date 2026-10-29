"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { acceptShareableInvitation } from "@/lib/actions/shareableInvitations";

export function JoinShareableInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setLoading(true);
    setError("");
    try {
      const result = await acceptShareableInvitation(token);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/app/books/${result.data.bookId}`);
      router.refresh();
    } catch {
      setError("Could not join the cookbook. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="primary" fullWidth loading={loading} onClick={join}>Join cookbook</Button>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
