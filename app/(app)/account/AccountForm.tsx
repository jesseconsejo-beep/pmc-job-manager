"use client";

import { useActionState } from "react";
import { ErrorNote, Label } from "@/components/ui";
import type { ActionResult } from "@/lib/validate";
import { updateMyProfile } from "./actions";

export function AccountForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateMyProfile, null);
  return (
    <form action={action} className="space-y-3">
      <ErrorNote message={state && !state.ok ? state.error : null} />
      {state?.ok && (
        <div role="status" className="border border-ok bg-bg px-3 py-2 text-xs text-ok">
          Saved.
        </div>
      )}
      <div>
        <Label htmlFor="name">Name</Label>
        <input id="name" name="name" required maxLength={120} autoComplete="name" defaultValue={name} className="input" />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          maxLength={50}
          autoComplete="tel"
          defaultValue={phone}
          placeholder="604-555-0123"
          className="input"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full bg-brand px-4 font-display text-sm font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
