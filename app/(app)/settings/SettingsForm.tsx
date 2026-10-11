"use client";

import { startTransition, useActionState, useState, type ReactNode } from "react";
import { ErrorNote, Label } from "@/components/ui";
import type { OrgSettings } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";
import { updateSettings } from "./actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HEX = /^#[0-9a-fA-F]{6}$/;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mb-4 border border-line bg-surface p-4">
      <legend className="px-1 font-display text-xs font-semibold uppercase tracking-[1.5px] text-brand">{title}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[10px] leading-relaxed text-faint">{children}</p>;
}

function ColorField({ name, label, initial }: { name: string; label: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const valid = HEX.test(value);
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : "#000000"}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 w-12 shrink-0 cursor-pointer border border-line bg-bg p-1"
        />
        <input
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value.trim())}
          pattern="#[0-9a-fA-F]{6}"
          maxLength={7}
          required
          spellCheck={false}
          autoCapitalize="none"
          className="input min-w-0 font-mono"
          aria-invalid={!valid}
        />
      </div>
    </div>
  );
}

export function SettingsForm({ settings: s, timezones }: { settings: OrgSettings; timezones: string[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateSettings, null);

  return (
    <form
      // `action` covers a submit before hydration. Once hydrated, submit by hand
      // inside a transition: React then skips its post-action field reset, so a
      // failed save keeps what was typed.
      action={action}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <Section title="Company">
        <div className="sm:col-span-2">
          <Label htmlFor="company_name">Company name</Label>
          <input id="company_name" name="company_name" required maxLength={120} defaultValue={s.company_name} className="input" />
        </div>
        <div>
          <Label htmlFor="company_short">Short name</Label>
          <input id="company_short" name="company_short" required maxLength={24} defaultValue={s.company_short} className="input" />
          <Hint>Shown in the header and on the crew page.</Hint>
        </div>
        <div>
          <Label htmlFor="legal_name">Legal name</Label>
          <input id="legal_name" name="legal_name" maxLength={200} defaultValue={s.legal_name ?? ""} className="input" />
        </div>
      </Section>

      <Section title="Brand">
        <ColorField name="color_primary" label="Primary colour" initial={s.color_primary} />
        <ColorField name="color_secondary" label="Secondary colour" initial={s.color_secondary} />
        <div className="sm:col-span-2">
          <Label htmlFor="assistant_name">Assistant name</Label>
          <input id="assistant_name" name="assistant_name" required maxLength={40} defaultValue={s.assistant_name} className="input" />
          <Hint>The name on the assistant tab in the bottom bar.</Hint>
        </div>
      </Section>

      <Section title="Time and pay">
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <select id="timezone" name="timezone" defaultValue={s.timezone} className="input">
            {timezones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="region">Region</Label>
          <input id="region" name="region" required maxLength={40} defaultValue={s.region} className="input" />
          <Hint>Province or state code, for example BC.</Hint>
        </div>
        <div>
          <Label htmlFor="pay_period_days">Pay period</Label>
          <select id="pay_period_days" name="pay_period_days" defaultValue={String(s.pay_period_days)} className="input">
            <option value="14">Every 2 weeks (14 days)</option>
            <option value="7">Every week (7 days)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="week_start_dow">Week starts on</Label>
          <select id="week_start_dow" name="week_start_dow" defaultValue={String(s.week_start_dow)} className="input">
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="pay_period_anchor_end">A real pay-period end date</Label>
          <input
            id="pay_period_anchor_end"
            name="pay_period_anchor_end"
            type="date"
            defaultValue={s.pay_period_anchor_end ?? ""}
            className="input sm:max-w-60"
          />
          <Hint>Any pay period that actually ended on this date; every other period is counted from it.</Hint>
        </div>
      </Section>

      <Section title="Numbers and email">
        <div>
          <Label htmlFor="job_number_prefix">Job number prefix</Label>
          <input
            id="job_number_prefix"
            name="job_number_prefix"
            maxLength={8}
            pattern="[A-Za-z0-9\-]{0,8}"
            defaultValue={s.job_number_prefix}
            className="input"
          />
        </div>
        <div>
          <Label htmlFor="service_number_prefix">Service call prefix</Label>
          <input
            id="service_number_prefix"
            name="service_number_prefix"
            maxLength={8}
            pattern="[A-Za-z0-9\-]{0,8}"
            defaultValue={s.service_number_prefix}
            className="input"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="orders_from_email">Orders sent from</Label>
          <input
            id="orders_from_email"
            name="orders_from_email"
            type="email"
            inputMode="email"
            maxLength={320}
            defaultValue={s.orders_from_email ?? ""}
            className="input"
          />
          <Hint>The address material orders are sent from.</Hint>
        </div>
      </Section>

      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-10 border-t border-line bg-bg/95 py-3 backdrop-blur">
        <ErrorNote message={state && !state.ok ? state.error : null} />
        {state?.ok && (
          <div role="status" className="mb-3 border border-ok bg-surface px-3 py-2 text-xs text-ok">
            Settings saved.
          </div>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full bg-brand px-6 font-display text-sm font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
