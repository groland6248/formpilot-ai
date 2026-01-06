// storage.js — chrome.storage wrappers

const KEY_PROFILE = "fp_profile_v1";
const KEY_SETTINGS = "fp_settings_v1";
const KEY_AUDIT = "fp_audit_v1";

export const DEFAULT_SETTINGS = {
  // Always block sensitive fields no matter what:
  hardBlockSensitive: true,

  // Skip unknown fields by default:
  skipUnknown: true
};

export const DEFAULT_PROFILE = {
  fullName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  company: "",
  title: "",
  website: ""
};

export async function getProfile() {
  const res = await chrome.storage.sync.get(KEY_PROFILE);
  return { ...DEFAULT_PROFILE, ...(res[KEY_PROFILE] || {}) };
}

export async function setProfile(profile) {
  await chrome.storage.sync.set({ [KEY_PROFILE]: profile });
}

export async function getSettings() {
  const res = await chrome.storage.sync.get(KEY_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(res[KEY_SETTINGS] || {}) };
}

export async function setSettings(settings) {
  await chrome.storage.sync.set({ [KEY_SETTINGS]: settings });
}

export async function getAuditLog() {
  const res = await chrome.storage.local.get(KEY_AUDIT);
  return Array.isArray(res[KEY_AUDIT]) ? res[KEY_AUDIT] : [];
}

export async function appendAudit(entry) {
  const log = await getAuditLog();
  log.unshift(entry);
  // keep last 100
  const trimmed = log.slice(0, 100);
  await chrome.storage.local.set({ [KEY_AUDIT]: trimmed });
}
