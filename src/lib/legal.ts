// Who runs Homosocial and how to reach them. Every legal page reads from here.
export const LEGAL = {
  company: "Homosocial LLC",
  state: "Florida",
  county: "Sarasota County, Florida",
  site: "homosocial.net",
  effective: "October 19, 2026",
  support: "support@homosocial.net",
  privacy: "privacy@homosocial.net",
  legal: "legal@homosocial.net",
  // Fill in once the LLC has a registered agent or mailing address. Never a home address.
  mailing: null as string | null,
};

// Bump these when the Terms or the biometric notice change in a way that
// matters. Everyone gets asked to agree again the next time they sign in.
export const TERMS_VERSION = "2026-10-19.2";
export const BIOMETRIC_VERSION = "2026-10-19";
