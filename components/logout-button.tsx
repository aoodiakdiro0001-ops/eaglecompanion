"use client";

import { useState } from "react";
import { LogOutIcon } from "./icons";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="btn-ghost"
      disabled={busy}
    >
      <LogOutIcon className="h-4 w-4" />
      {busy ? "جارٍ الخروج..." : "تسجيل الخروج"}
    </button>
  );
}
