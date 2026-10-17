// Reads the PDF417 barcode text on the back of US and Canadian driver's
// licenses and ID cards (AAMVA standard, all versions).

export type LicenseData = {
  kind: "license";
  docNumber: string;
  issuer: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  expires: Date | null;
};

function parseDate(v: string | undefined, preferYearFirst: boolean): Date | null {
  if (!v) return null;
  const d = v.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const tryMake = (y: number, m: number, day: number) => {
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || day < 1 || day > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, day));
    return dt.getUTCMonth() === m - 1 ? dt : null;
  };
  const yearFirst = tryMake(+d.slice(0, 4), +d.slice(4, 6), +d.slice(6, 8));
  const monthFirst = tryMake(+d.slice(4, 8), +d.slice(0, 2), +d.slice(2, 4));
  return preferYearFirst ? (yearFirst ?? monthFirst) : (monthFirst ?? yearFirst);
}

export function parseAamva(text: string): LicenseData | null {
  if (!/ANSI|AAMVA/.test(text)) return null;
  const fields = new Map<string, string>();
  const lines = text.split(/[\n\r\x1e]+/);
  for (let line of lines) {
    if (/ANSI|AAMVA/.test(line)) {
      // Header line: the first data element starts right after "DL" or "ID".
      const m = line.match(/(?:DL|ID)(D[A-Z]{2}.*)$/);
      if (!m) continue;
      line = m[1];
    }
    const m = line.match(/^(D[A-Z]{2})(.*)$/);
    if (m && !fields.has(m[1])) fields.set(m[1], m[2].trim());
  }
  const country = fields.get("DCG") ?? "USA";
  const yearFirst = country === "CAN";
  const birthDate = parseDate(fields.get("DBB"), yearFirst);
  const docNumber = (fields.get("DAQ") ?? "").replace(/\s/g, "");
  if (!birthDate || !docNumber) return null;

  let first = fields.get("DAC") ?? fields.get("DCT") ?? "";
  let last = fields.get("DCS") ?? fields.get("DAB") ?? "";
  if ((!first || !last) && fields.get("DAA")) {
    const parts = fields.get("DAA")!.split(/[,$]/);
    last = last || parts[0] || "";
    first = first || parts[1] || "";
  }
  const issuerMatch = text.match(/ANSI ?(\d{6})/);
  return {
    kind: "license",
    docNumber,
    issuer: fields.get("DAJ") || issuerMatch?.[1] || "US",
    firstName: first.trim(),
    lastName: last.trim(),
    birthDate,
    expires: parseDate(fields.get("DBA"), yearFirst),
  };
}
