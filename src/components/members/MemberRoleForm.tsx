"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";
import { updateMemberRole } from "@/lib/actions/members";
import type { UpdateMemberRoleInput } from "@/lib/validators/member";

interface MemberRoleFormProps {
  bookId: string;
  userId: string;
  currentRole: UpdateMemberRoleInput;
  isFree: boolean;
}

export function MemberRoleForm({ bookId, userId, currentRole, isFree }: MemberRoleFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<UpdateMemberRoleInput>(currentRole);
  const [savedRole, setSavedRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const result = await updateMemberRole(bookId, userId, role);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSavedRole(role);
    setSuccess(true);
    router.refresh();
  }

  return (
    <div className="mb-4 rounded-lg border border-line-soft bg-card/70 p-4">
      <p className="text-sm font-bold text-green-deep">Member access</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Family can view and respond to recipes. Contributors can also add recipes and edit their own.
      </p>
      <div className="mt-3 max-w-sm">
        <Select
          label="Role in this cookbook"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UpdateMemberRoleInput);
            setError(null);
            setSuccess(false);
          }}
          disabled={saving}
        >
          <option value="family">Family</option>
          <option value="contributor" disabled={isFree && currentRole !== "contributor"}>Contributor</option>
        </Select>
      </div>
      {isFree && <p className="mt-2 text-xs text-ink-muted">Plus is required to grant Contributor access.</p>}
      <Button type="button" variant="primary" size="sm" className="mt-3" onClick={handleSave} disabled={saving || role === savedRole} loading={saving}>
        Save role
      </Button>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
      {success && <p role="status" className="mt-3 text-sm font-medium text-green-deep">Member role updated.</p>}
    </div>
  );
}
