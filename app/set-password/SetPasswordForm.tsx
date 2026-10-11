"use client";

import { useActionState } from "react";
import { AuthSubmit } from "@/components/AuthShell";
import { ErrorNote, Label } from "@/components/ui";
import { setPassword, type SetPasswordState } from "./actions";

const initial: SetPasswordState = { error: null };

export function SetPasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(setPassword, initial);
  return (
    <form action={action} className="space-y-3">
      <ErrorNote message={state.error} />
      {/* Lets password managers file the new password under the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <p className="break-all text-xs text-dim">For {email}</p>
      <div>
        <Label htmlFor="password">New password</Label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          className="input"
        />
        <p className="mt-1 text-[10px] text-faint">At least 10 characters.</p>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm password</Label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          className="input"
        />
      </div>
      <AuthSubmit pending={pending} label="Save password" pendingLabel="Saving…" />
    </form>
  );
}
