"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertIcon, PlusIcon } from "./icons";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        workspace?: { id: string };
        error?: string;
      };
      if (!response.ok || !data.workspace) {
        setError(data.error ?? "تعذر إنشاء المساحة");
        return;
      }
      setName("");
      router.push(`/app?ws=${data.workspace.id}`);
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={create}>
      <div>
        <label className="label" htmlFor="workspace-name">
          اسم المساحة
        </label>
        <input
          id="workspace-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="مثال: مساحة العائلة"
          required
          minLength={2}
          maxLength={60}
        />
      </div>
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
      <button type="submit" className="btn-primary" disabled={busy}>
        <PlusIcon className="h-4 w-4" />
        {busy ? "جارٍ الإنشاء..." : "إنشاء مساحة"}
      </button>
    </form>
  );
}
