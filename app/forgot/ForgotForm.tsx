"use client";

import { useActionState } from "react";
import { AuthSubmit } from "@/components/AuthShell";
import { ErrorNote, Label } from "@/components/ui";
import { requestReset, type ForgotState } from "./actions";

const initial: ForgotState = { sent: false, error: null, email: "" };

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, initial);

  if (state.sent) {
    return (
      <div role="status" className="border border-ok bg-bg px-3 py-3 text-sm leading-relaxed text-ink">
        If that address has an account, a reset link is on its way. Check your email (and the spam folder).
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <ErrorNote message={state.error} />
      <p className="text-xs leading-relaxed text-dim">Enter your email and we will send a link to choose a new password.</p>
      <div>
        <Label htmlFor="email">Email</Label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          className="input"
        />
      </div>
      <AuthSubmit pending={pending} label="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}
