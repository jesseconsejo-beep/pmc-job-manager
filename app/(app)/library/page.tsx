import Link from "next/link";
import { ChevronRight, MessageSquare } from "lucide-react";
import { Page } from "@/components/ui";
import { libraryCategories } from "@/lib/library";
import { getOrg } from "@/lib/org";
import { isBC } from "@/lib/schedule-shared";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { LibraryCategory } from "@/lib/types";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  await requireMember();
  const org = await getOrg();
  const supabase = await createClient();
  const [docsRes, settingsRes] = await Promise.all([
    supabase.from("library_docs").select("category"),
    supabase.from("org_settings").select("region").limit(1).maybeSingle(),
  ]);

  const bc = isBC(settingsRes.data?.region);
  const categories = libraryCategories({ companyShort: org.companyShort, bc });
  const counts = new Map<LibraryCategory, number>();
  for (const d of docsRes.data ?? []) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  const total = docsRes.data?.length ?? 0;
  const short = org.companyShort;

  return (
    <Page narrow>
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-bold uppercase tracking-[1.5px]">Reference library</h1>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-dim">
          {total} {total === 1 ? "document" : "documents"} · Codes, manuals, specs, standards, safety
        </p>
      </div>

      {docsRes.error && (
        <div role="alert" className="mb-4 border border-danger p-3 text-xs text-danger">
          Could not load the library: {docsRes.error.message}
        </div>
      )}

      <div className="relative mb-5 overflow-hidden border border-steel bg-linear-to-br from-steel-dark to-surface p-4">
        <MessageSquare size={120} className="pointer-events-none absolute -right-4 -top-4 text-steel opacity-10" aria-hidden />
        <div className="relative">
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-steel">Every document you add here...</div>
          <div className="mt-1 max-w-[500px] font-display text-lg leading-snug">
            ...is what {org.assistantName} will search when it goes live. Start building the library now so it&apos;s ready.
          </div>
        </div>
      </div>

      <div className="grid gap-2.5">
        {categories.map((cat) => {
          const count = counts.get(cat.key) ?? 0;
          const Icon = cat.icon;
          return (
            <Link
              key={cat.key}
              href={`/library/${cat.key}`}
              className="flex min-h-11 items-center gap-3.5 border border-line bg-surface p-3.5 hover:border-line-2"
              style={{ borderLeft: `4px solid ${cat.color}` }}
            >
              <Icon size={24} className="shrink-0" style={{ color: cat.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="break-words font-display text-base font-semibold uppercase tracking-[1px]">{cat.label}</div>
                <div className="mt-0.5 text-[11px] text-dim">{cat.desc}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-[22px] font-bold leading-none" style={{ color: cat.color }}>
                  {count}
                </div>
                <div className="mt-1 text-[9px] tracking-[1px] text-dim">{count === 1 ? "DOC" : "DOCS"}</div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-dim" aria-hidden />
            </Link>
          );
        })}
      </div>

      {bc && (
        <section className="mt-6">
          <h2 className="mb-2 text-[11px] uppercase tracking-[1.5px] text-dim">Suggested for {short}</h2>
          <div className="grid gap-2 border border-line bg-surface p-3.5 text-xs leading-relaxed">
            <p>
              <strong className="text-brand">Codes (priority):</strong> BC Plumbing Code 2024 (BCBC Book II), BC Building
              Code 2024 (Book I), BC Fire Code 2024, ASHRAE 62.1 Ventilation, SMACNA HVAC Duct Construction Standards 4th
              Ed., CSA B149.1 Gas Code
            </p>
            <p>
              <strong className="text-steel">Manufacturer manuals:</strong> Viega ProPress installation guide, Uponor PEX-A
              install manual, Bradford White water heater install guides, RIDGID press tool manual, Milwaukee tool manuals
            </p>
            <p>
              <strong className="text-brand">{short} standards (build these):</strong> scope-of-work template, install
              standards (copper, PEX, ABS), warranty terms, safety policies, common RFI responses
            </p>
          </div>
        </section>
      )}
    </Page>
  );
}
