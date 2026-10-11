"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";
import { AuthSubmit } from "@/components/AuthShell";
import { ErrorNote, Label } from "@/components/ui";

const initial: SignInState = { error: null, email: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-3">
      <ErrorNote message={state.error} />
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
      <div>
        <Label htmlFor="password">Password</Label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <AuthSubmit pending={pending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
