"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { setLogoPath } from "./actions";

const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Uploads straight from the browser to the public 'branding' bucket at
 * logo/<timestamp>.<ext> (the storage policy allows owners/developers only),
 * then saves the path in org_settings. The previous file is removed after
 * the new one is saved. SVG is not accepted: it can carry script.
 */
export function LogoUpload({
  logoPath,
  logoUrl,
  companyShort,
}: {
  logoPath: string | null;
  logoUrl: string | null;
  companyShort: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const removeOld = async (path: string | null) => {
    if (!path) return;
    // Best effort: a leftover file is harmless, so failures are ignored.
    await createClient().storage.from("branding").remove([path]);
  };

  const onFile = (file: File | undefined) => {
    setError(null);
    setNote(null);
    if (!file) return;
    const ext = TYPES[file.type];
    if (!ext) return setError("Use a PNG, JPG, WebP or GIF image.");
    if (file.size > MAX_BYTES) return setError("That image is over 2 MB. Use a smaller file.");

    startTransition(async () => {
      const path = `logo/${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("branding")
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      const r = await setLogoPath(path);
      if (!r.ok) {
        await supabase.storage.from("branding").remove([path]);
        setError(r.error);
        return;
      }
      await removeOld(logoPath);
      setNote("Logo updated.");
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const onRemove = () => {
    if (!window.confirm("Remove the logo? The header will show the short name instead.")) return;
    setError(null);
    setNote(null);
    startTransition(async () => {
      const r = await setLogoPath(null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      await removeOld(logoPath);
      setNote("Logo removed.");
    });
  };

  return (
    <section className={`mb-4 border border-line bg-surface p-4 ${pending ? "opacity-60" : ""}`}>
      <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-[1.5px] text-brand">Logo</h2>
      <ErrorNote message={error} />
      {note && (
        <div role="status" className="mb-3 border border-ok bg-bg px-3 py-2 text-xs text-ok">
          {note}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant logo from a public bucket
          <img src={logoUrl} alt="Current logo" className="h-16 w-16 shrink-0 rounded border border-line bg-bg object-contain" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center bg-brand font-display text-lg font-bold text-bg">
            {companyShort.slice(0, 3).toUpperCase()}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-1.5 border border-line-2 bg-surface-2 px-3 font-display text-[11px] uppercase tracking-wider text-ink hover:border-brand hover:text-brand">
            <ImageUp size={14} /> {logoUrl ? "Replace" : "Upload"}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={pending}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="flex min-h-11 items-center gap-1.5 border border-line-2 px-3 font-display text-[11px] uppercase tracking-wider text-faint hover:border-danger hover:text-danger"
            >
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-faint">Square images work best. PNG, JPG, WebP or GIF, up to 2 MB. Shown in the header and on the sign-in page.</p>
    </section>
  );
}
