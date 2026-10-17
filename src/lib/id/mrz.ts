// Reads the machine-readable lines (the <<< rows) on passports, passport
// cards, green cards and other travel documents worldwide.
import { parse } from "mrz";

export type MrzData = {
  kind: "mrz";
  format: string;
  docNumber: string;
  issuer: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  expires: Date | null;
};

// OCR often reads the filler '<' as L, K or C. Clean that up and snap each
// line to its official length.
export function cleanMrzLines(raw: string[]): string[][] {
  const lines = raw
    .map((l) => l.toUpperCase().replace(/[^A-Z0-9<]/g, ""))
    .filter((l) => l.length >= 26 && (l.match(/</g) ?? []).length >= 2);
  const fix = (l: string, n: number) =>
    (l.length > n ? l.slice(0, n) : l.padEnd(n, "<"))
      .replace(/<[<KLC]{2,}$/, (m) => "<".repeat(m.length))
      .replace(/<[KLC](?=<)/g, "<<");
  const options: string[][] = [];
  const add = (count: number, n: number) => {
    for (let i = 0; i + count <= lines.length; i++) {
      const pick = lines.slice(i, i + count);
      if (pick.every((l) => Math.abs(l.length - n) <= 3)) options.push(pick.map((l) => fix(l, n)));
    }
  };
  add(2, 44); // passport book (TD3)
  add(3, 30); // cards: passport card, green card, national IDs (TD1)
  add(2, 36); // TD2
  return options;
}

function mrzDate(v: string | null | undefined, isBirth: boolean): Date | null {
  if (!v || !/^\d{6}$/.test(v)) return null;
  const yy = +v.slice(0, 2);
  const nowYY = new Date().getUTCFullYear() % 100;
  const year = isBirth ? (yy > nowYY ? 1900 + yy : 2000 + yy) : 2000 + yy;
  const m = +v.slice(2, 4);
  const d = +v.slice(4, 6);
  const dt = new Date(Date.UTC(year, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? dt : null;
}

export function parseMrz(rawLines: string[]): MrzData | null {
  for (const lines of cleanMrzLines(rawLines)) {
    let r;
    try {
      r = parse(lines, { autocorrect: true });
    } catch {
      continue;
    }
    // The check digits are what make this trustworthy. Require them.
    const ok = (field: string) => r.details.some((d) => d.field === field && d.valid);
    if (!ok("documentNumberCheckDigit") || !ok("birthDateCheckDigit") || !ok("expirationDateCheckDigit")) continue;
    const f = r.fields;
    const birthDate = mrzDate(f.birthDate, true);
    if (!birthDate || !f.documentNumber) continue;
    return {
      kind: "mrz",
      format: r.format,
      docNumber: f.documentNumber,
      issuer: f.issuingState ?? lines[0].slice(2, 5).replace(/</g, ""),
      firstName: f.firstName ?? "",
      lastName: f.lastName ?? "",
      birthDate,
      expires: mrzDate(f.expirationDate, false),
    };
  }
  return null;
}
