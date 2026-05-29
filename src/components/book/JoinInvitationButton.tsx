"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { acceptInvitation } from "@/lib/actions/members";

interface Props {
  token: string;
}

export function JoinInvitationButton({ token }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    setError(null);
    setJoining(true);
    const result = await acceptInvitation(token);
    if (!result.success) {
      setError(result.error);
      setJoining(false);
      return;
    }
    router.push(`/app/books/${result.data.bookId}`);
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="primary"
        onClick={handleJoin}
        loading={joining}
      >
        Join
      </Button>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
