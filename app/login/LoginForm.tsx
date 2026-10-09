"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";
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
      <button
        type="submit"
        disabled={pending}
        className="mt-2 min-h-12 w-full bg-brand font-display text-sm font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
