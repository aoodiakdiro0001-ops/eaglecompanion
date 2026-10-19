"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertIcon, TrashIcon } from "./icons";

export function RevokeButton({
  deviceId,
  workspaceId,
}: {
  deviceId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "تعذر إلغاء الجهاز");
        return;
      }
      router.replace(`/app?ws=${workspaceId}`);
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn-danger"
        onClick={() => setConfirming(true)}
      >
        <TrashIcon className="h-4 w-4" />
        إلغاء الجهاز
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm font-semibold text-danger">
        تأكيد إلغاء وصول الجهاز؟
      </p>
      <p className="mt-1 text-xs leading-6 text-muted">
        سيتوقف الجهاز عن إرسال حالته فوراً، وتُنهى أي مشاركة نشطة. يبقى الحدث في
        سجل التدقيق.
      </p>
      {error ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertIcon className="h-4 w-4" />
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-danger btn-sm"
          onClick={() => void revoke()}
          disabled={busy}
        >
          {busy ? "جارٍ الإلغاء..." : "نعم، ألغِ الوصول"}
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          تراجع
        </button>
      </div>
    </div>
  );
}
