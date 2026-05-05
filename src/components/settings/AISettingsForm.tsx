"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui";
import { saveAISettings } from "@/lib/actions/aiSettings";
import type { AIProvider } from "@/lib/types/database";

interface AISettingsFormProps {
  currentProvider: AIProvider | null;
  currentKey: string | null;
}

const PROVIDERS: { id: AIProvider; label: string; placeholder: string; hint: string }[] = [
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    hint: "Works with GPT-4o mini and other OpenAI models.",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    placeholder: "sk-ant-...",
    hint: "Uses Claude Haiku for fast, high-quality recipe ideas.",
  },
];

export function AISettingsForm({ currentProvider, currentKey }: AISettingsFormProps) {
  const [provider, setProvider] = useState<AIProvider | null>(currentProvider);
  const [key, setKey] = useState(currentKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    provider !== currentProvider || key.trim() !== (currentKey ?? "");

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);
  const hasActiveKey = !!(currentProvider && currentKey && !isDirty);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveAISettings(provider, key);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  function handleClear() {
    setProvider(null);
    setKey("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Provider selection */}
      <div className="space-y-2">
        {PROVIDERS.map((p) => (
          <label
            key={p.id}
            className={clsx(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors",
              provider === p.id
                ? "border-green-deep bg-green-pale/50"
                : "border-line-soft bg-card hover:border-line hover:bg-card-muted"
            )}
          >
            <input
              type="radio"
              name="ai-provider"
              value={p.id}
              checked={provider === p.id}
              onChange={() => { setProvider(p.id); setKey(""); setSaved(false); }}
              className="mt-0.5 accent-green-deep"
            />
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{p.label}</span>
              <span className="block text-xs text-ink-muted">{p.hint}</span>
            </div>
          </label>
        ))}
      </div>

      {/* API key input — only shown when a provider is selected */}
      {provider && (
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink" htmlFor="ai-api-key">
            {selectedProvider?.label} API key
            {hasActiveKey && (
              <span className="rounded-sm bg-green-pale px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-deep">
                Active
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="ai-api-key"
              type={showKey ? "text" : "password"}
              className="input-cookbook w-full pr-10 font-mono text-sm"
              placeholder={selectedProvider?.placeholder}
              value={key}
              onChange={(e) => { setKey(e.target.value); setSaved(false); }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
          <p className="mt-1.5 text-xs text-ink-soft">
            Stored privately — only you can see it, and it's only used for recipe generation.
            {hasActiveKey && " Clear the field and save to remove it."}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!isDirty || saving}
          loading={saving}
        >
          {saved ? "Saved!" : "Save"}
        </Button>
        {(currentProvider || provider) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm font-semibold text-ink-soft hover:text-ink disabled:opacity-40"
            disabled={saving || (!currentProvider && !provider)}
          >
            Use default
          </button>
        )}
      </div>
    </form>
  );
}
