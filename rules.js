// rules.js — deterministic field classification + safety guardrails

export const SENSITIVE_TYPES = new Set([
  "creditCard",
  "ssn",
  "bank",
  "password",
  "dob"
]);

export const FIELD_TYPES = {
  fullName: "fullName",
  firstName: "firstName",
  lastName: "lastName",
  email: "email",
  phone: "phone",
  address1: "address1",
  address2: "address2",
  city: "city",
  state: "state",
  zip: "zip",
  country: "country",
  company: "company",
  title: "title",
  website: "website",

  // Sensitive
  creditCard: "creditCard",
  ssn: "ssn",
  bank: "bank",
  password: "password",
  dob: "dob",

  unknown: "unknown"
};

const patterns = [
  // Sensitive first
  { type: FIELD_TYPES.password, rx: /(password|passcode|pwd)/i },
  { type: FIELD_TYPES.creditCard, rx: /(card\s*number|cc-number|credit\s*card|cardnumber|ccnum)/i },
  { type: FIELD_TYPES.ssn, rx: /(ssn|social\s*security)/i },
  { type: FIELD_TYPES.bank, rx: /(routing|account\s*number|iban|swift)/i },
  { type: FIELD_TYPES.dob, rx: /(date\s*of\s*birth|dob|birthdate|birthday)/i },

  // Common
  { type: FIELD_TYPES.email, rx: /(email|e-mail)/i },
  { type: FIELD_TYPES.phone, rx: /(phone|mobile|cell)/i },
  { type: FIELD_TYPES.firstName, rx: /(first\s*name|given\s*name|fname)/i },
  { type: FIELD_TYPES.lastName, rx: /(last\s*name|surname|family\s*name|lname)/i },
  { type: FIELD_TYPES.fullName, rx: /(full\s*name|name(?!\s*on\s*card))/i },

  { type: FIELD_TYPES.company, rx: /(company|organization|employer)/i },
  { type: FIELD_TYPES.title, rx: /(job\s*title|title|position)/i },
  { type: FIELD_TYPES.website, rx: /(website|url|portfolio|linkedin|github)/i },

  // Address
  { type: FIELD_TYPES.address1, rx: /(address\s*1|street|address(?!\s*2))/i },
  { type: FIELD_TYPES.address2, rx: /(address\s*2|apt|suite|unit)/i },
  { type: FIELD_TYPES.city, rx: /(city|town)/i },
  { type: FIELD_TYPES.state, rx: /(state|province|region)/i },
  { type: FIELD_TYPES.zip, rx: /(zip|postal)/i },
  { type: FIELD_TYPES.country, rx: /(country)/i }
];

export function classifyField(meta) {
  const hay = [
    meta.name,
    meta.id,
    meta.placeholder,
    meta.labelText,
    meta.ariaLabel,
    meta.autocomplete,
    meta.typeAttr
  ]
    .filter(Boolean)
    .join(" | ");

  for (const p of patterns) {
    if (p.rx.test(hay)) return p.type;
  }

  // Heuristics: input type=email/telephone/password
  const t = (meta.typeAttr || "").toLowerCase();
  if (t === "email") return FIELD_TYPES.email;
  if (t === "tel") return FIELD_TYPES.phone;
  if (t === "password") return FIELD_TYPES.password;

  return FIELD_TYPES.unknown;
}

export function isSensitive(fieldType) {
  return SENSITIVE_TYPES.has(fieldType);
}

export function explainDecision(fieldType) {
  if (isSensitive(fieldType)) {
    return `Blocked: classified as sensitive (${fieldType}).`;
  }
  if (fieldType === FIELD_TYPES.unknown) {
    return "Skipped: unknown field type (needs manual confirmation).";
  }
  return `Safe: classified as ${fieldType}.`;
}
