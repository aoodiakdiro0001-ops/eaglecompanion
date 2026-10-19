"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/types";
import { CopyButton } from "./copy-button";
import {
  AlertIcon,
  KeyIcon,
  LinkIcon,
  RefreshIcon,
  UsersIcon,
} from "./icons";

interface InviteState {
  code: string;
  expiresAt: number;
}

export function InvitePanel({
  workspaceId,
  role,
}: {
  workspaceId: string;
  role: Role;
}) {
  const [inviteRole, setInviteRole] = useState<"member" | "viewer">("member");
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (role !== "owner") {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UsersIcon className="h-4 w-4 text-brand" />
          دعوة أعضاء
        </div>
        <p className="mt-2 text-xs leading-6 text-muted">
          إنشاء الدعوات متاح لمالك المساحة فقط. يمكنك دائماً الانضمام إلى مساحة
          أخرى بكود دعوة من البطاقة المجاورة.
        </p>
      </div>
    );
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        invite?: InviteState;
        error?: string;
      };
      if (!response.ok || !data.invite) {
        setError(data.error ?? "تعذر إنشاء الدعوة");
        return;
      }
      setInvite(data.invite);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <KeyIcon className="h-4 w-4 text-brand" />
        دعوة عضو جديد
      </div>
      <p className="mt-2 text-xs leading-6 text-muted">
        الدعوة صالحة 24 ساعة ولمرة واحدة. العضو يمكنه إضافة الأجهزة وإلغاؤها،
        والمشاهد يقرأ الحالة فقط.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="invite-role">
            الدور
          </label>
          <select
            id="invite-role"
            className="input"
            value={inviteRole}
            onChange={(event) =>
              setInviteRole(event.target.value as "member" | "viewer")
            }
          >
            <option value="member">عضو — إدارة الأجهزة</option>
            <option value="viewer">مشاهد — قراءة فقط</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => void generate()}
          disabled={busy}
        >
          <RefreshIcon className="h-4 w-4" />
          {busy ? "جارٍ الإنشاء..." : "إنشاء كود دعوة"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {invite ? (
        <div className="mt-4 rounded-xl border border-brand/25 bg-brand/5 p-4 text-center">
          <p className="text-[11px] text-muted">كود الدعوة</p>
          <p className="mt-1.5 font-mono text-2xl font-black tracking-[0.18em] text-brand" dir="ltr">
            {invite.code}
          </p>
          <div className="mt-3 flex justify-center">
            <CopyButton value={invite.code} label="نسخ الكود" />
          </div>
          <p className="mt-2 text-[10px] text-muted">
            ينتهي في{" "}
            {new Intl.DateTimeFormat("ar", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(invite.expiresAt))}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function JoinWorkspacePanel() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        workspace?: { id: string };
        error?: string;
      };
      if (!response.ok || !data.workspace) {
        setError(data.error ?? "تعذر الانضمام");
        return;
      }
      router.push(`/app?ws=${data.workspace.id}`);
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <LinkIcon className="h-4 w-4 text-accent" />
        الانضمام إلى مساحة
      </div>
      <p className="mt-2 text-xs leading-6 text-muted">
        أدخل كود دعوة حصلت عليه من مالك المساحة. الانضمام لا يمنحك أي صلاحية على
        أجهزة لم تُقترن بهذه المساحة.
      </p>
      <form className="mt-4 flex gap-2" onSubmit={join}>
        <input
          className="input"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="ABCD-EFGH"
          dir="ltr"
          required
          minLength={4}
          maxLength={32}
          aria-label="كود الدعوة"
        />
        <button type="submit" className="btn-ghost shrink-0" disabled={busy}>
          {busy ? "جارٍ..." : "انضمام"}
        </button>
      </form>
      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
    </div>
  );
}
