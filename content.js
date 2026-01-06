import { classifyField, explainDecision, isSensitive, FIELD_TYPES } from "./rules.js";
import { getProfile, getSettings, appendAudit } from "./storage.js";

function getLabelText(el) {
  // <label for="id">
  if (el.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lbl) return (lbl.textContent || "").trim();
  }
  // parent label wrapper
  const parentLabel = el.closest("label");
  if (parentLabel) return (parentLabel.textContent || "").trim();
  return "";
}

function collectFillableElements() {
  const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
  const usable = inputs.filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-disabled") === "true") return false;
    if (el.type && ["hidden", "submit", "button", "reset", "file"].includes(el.type)) return false;
    return true;
  });

  return usable.map((el) => ({
    tag: el.tagName.toLowerCase(),
    typeAttr: (el.getAttribute("type") || "").toLowerCase(),
    name: el.getAttribute("name") || "",
    id: el.id || "",
    placeholder: el.getAttribute("placeholder") || "",
    ariaLabel: el.getAttribute("aria-label") || "",
    autocomplete: el.getAttribute("autocomplete") || "",
    labelText: getLabelText(el),
    value: el.value || "",
    selector: buildStableSelector(el)
  }));
}

function buildStableSelector(el) {
  // Best-effort selector that usually works across pages:
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = el.getAttribute("name");
  if (name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
  // fallback: nth-of-type within parent
  const parent = el.parentElement;
  if (!parent) return el.tagName.toLowerCase();
  const siblings = Array.from(parent.querySelectorAll(el.tagName.toLowerCase()));
  const idx = siblings.indexOf(el) + 1;
  return `${el.tagName.toLowerCase()}:nth-of-type(${idx})`;
}

function valueForType(profile, fieldType) {
  return profile[fieldType] ?? "";
}

function makePlan(fieldsMeta, profile, settings) {
  const plan = fieldsMeta.map((meta) => {
    const fieldType = classifyField(meta);
    const sensitive = isSensitive(fieldType);
    const proposedValue = valueForType(profile, fieldType);

    // decision logic:
    let action = "skip";
    let reason = explainDecision(fieldType);

    if (sensitive && settings.hardBlockSensitive) {
      action = "blocked";
      reason = `Blocked: sensitive field (${fieldType}) hard-blocked.`;
    } else if (fieldType === FIELD_TYPES.unknown && settings.skipUnknown) {
      action = "skip";
      reason = "Skipped: unknown field type (user can fill manually).";
    } else if (proposedValue && fieldType !== FIELD_TYPES.unknown && !sensitive) {
      action = "fill";
      reason = `Will fill: ${fieldType}.`;
    } else if (!proposedValue && fieldType !== FIELD_TYPES.unknown && !sensitive) {
      action = "skip";
      reason = `Skipped: profile has no value for ${fieldType}.`;
    }

    return {
      ...meta,
      fieldType,
      sensitive,
      proposedValue,
      action,
      reason
    };
  });

  return plan;
}

function applyFill(plan, approvals) {
  // approvals is a map selector -> boolean
  const results = [];

  for (const item of plan) {
    const allow = approvals[item.selector] === true;

    if (item.action !== "fill") {
      results.push({ selector: item.selector, status: item.action, reason: item.reason });
      continue;
    }

    if (!allow) {
      results.push({ selector: item.selector, status: "skipped_by_user", reason: "User did not approve." });
      continue;
    }

    const el = document.querySelector(item.selector);
    if (!el) {
      results.push({ selector: item.selector, status: "not_found", reason: "Element not found." });
      continue;
    }

    try {
      // set value + dispatch events so React/Angular etc update
      el.focus();
      if (el.tagName.toLowerCase() === "select") {
        // naive: match by value/text
        const opt = Array.from(el.options).find(
          (o) =>
            o.value.toLowerCase() === item.proposedValue.toLowerCase() ||
            o.text.toLowerCase() === item.proposedValue.toLowerCase()
        );
        if (opt) el.value = opt.value;
      } else {
        el.value = item.proposedValue;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.blur();

      results.push({ selector: item.selector, status: "filled", reason: `Filled ${item.fieldType}.` });
    } catch (e) {
      results.push({ selector: item.selector, status: "error", reason: String(e) });
    }
  }

  return results;
}

// Message bridge with popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "FP_SCAN") {
      const fields = collectFillableElements();
      const profile = await getProfile();
      const settings = await getSettings();
      const plan = makePlan(fields, profile, settings);

      sendResponse({ ok: true, plan });
      return;
    }

    if (msg?.type === "FP_APPLY") {
      const { approvals } = msg;
      const fields = collectFillableElements();
      const profile = await getProfile();
      const settings = await getSettings();
      const plan = makePlan(fields, profile, settings);

      const results = applyFill(plan, approvals || {});
      const audit = {
        ts: new Date().toISOString(),
        url: location.href,
        host: location.host,
        filled: results.filter((r) => r.status === "filled").length,
        blocked: plan.filter((p) => p.action === "blocked").length,
        skipped: results.filter((r) => r.status.startsWith("skip") || r.status.includes("skipped")).length,
        results: results.slice(0, 50) // keep it light
      };

      await appendAudit(audit);
      sendResponse({ ok: true, audit });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message." });
  })();

  return true; // keep channel open for async
});
