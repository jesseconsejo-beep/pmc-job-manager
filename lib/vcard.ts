/** A contact card that iPhone / Android Contacts can import (Phase 1 SAVE button). */
export type VCardInput = {
  name: string;
  title?: string | null;
  org?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
};

/** vCard 3.0 text; commas, semicolons and newlines in values are escaped. */
export function buildVCard(c: VCardInput): string {
  const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(c.name)}`,
    `N:${esc(c.name)};;;;`,
    c.title && `TITLE:${esc(c.title)}`,
    c.org && `ORG:${esc(c.org)}`,
    c.phone && `TEL;TYPE=CELL:${c.phone}`,
    c.email && `EMAIL:${c.email}`,
    c.note && `NOTE:${esc(c.note)}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/** Browser only: downloads `<name>.vcf`. */
export function downloadVCard(c: VCardInput): void {
  const url = URL.createObjectURL(new Blob([buildVCard(c)], { type: "text/vcard" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${c.name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "contact"}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
