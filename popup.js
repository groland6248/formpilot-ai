async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function badgeFor(item) {
  if (item.action === "blocked") return { cls: "bad", text: "BLOCKED" };
  if (item.action === "fill") return { cls: "ok", text: "SAFE" };
  return { cls: "warn", text: "SKIP" };
}

let plan = [];
let approvals = {}; // selector -> boolean

const listEl = document.getElementById("list");
const scanBtn = document.getElementById("scanBtn");
const applyBtn = document.getElementById("applyBtn");
const approveSafeBtn = document.getElementById("approveSafeBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

function render() {
  listEl.innerHTML = "";

  if (!plan.length) {
    listEl.innerHTML = `<div class="item"><div class="k">No scan yet.</div><div class="reason">Click <b>Scan Page</b> to generate a safe autofill plan.</div></div>`;
    applyBtn.disabled = true;
    return;
  }

  for (const item of plan) {
    const b = badgeFor(item);
    const label = (item.labelText || item.placeholder || item.name || item.id || item.selector).slice(0, 60);

    const canApprove = item.action === "fill";
    const checked = approvals[item.selector] === true;

    const html = document.createElement("div");
    html.className = "item";
    html.innerHTML = `
      <div class="row">
        <div>
          <div class="v">${escapeHtml(item.fieldType)}</div>
          <div class="k">${escapeHtml(label)}</div>
        </div>
        <div class="row">
          <span class="badge ${b.cls}">${b.text}</span>
          ${
            canApprove
              ? `<label class="toggle"><input data-sel="${escapeAttr(item.selector)}" type="checkbox" ${
                  checked ? "checked" : ""
                } /> <span class="k">Approve</span></label>`
              : ""
          }
        </div>
      </div>
      <div class="reason">${escapeHtml(item.reason)}</div>
    `;
    listEl.appendChild(html);
  }

  const approvedCount = Object.values(approvals).filter(Boolean).length;
  applyBtn.disabled = approvedCount === 0;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}

listEl.addEventListener("change", (e) => {
  const t = e.target;
  if (t && t.matches('input[type="checkbox"][data-sel]')) {
    const sel = t.getAttribute("data-sel");
    approvals[sel] = t.checked;
    render();
  }
});

scanBtn.addEventListener("click", async () => {
  statusEl.textContent = "Scanning…";
  const tab = await getActiveTab();
  const res = await chrome.tabs.sendMessage(tab.id, { type: "FP_SCAN" });
  if (!res?.ok) {
    statusEl.textContent = "Could not scan this page.";
    return;
  }
  plan = res.plan || [];
  approvals = {};
  statusEl.textContent = `Scan complete: ${plan.length} fields found.`;
  render();
});

approveSafeBtn.addEventListener("click", () => {
  for (const item of plan) {
    if (item.action === "fill") approvals[item.selector] = true;
  }
  render();
});

clearBtn.addEventListener("click", () => {
  plan = [];
  approvals = {};
  statusEl.textContent = "";
  render();
});

applyBtn.addEventListener("click", async () => {
  statusEl.textContent = "Applying approved fills…";
  const tab = await getActiveTab();
  const res = await chrome.tabs.sendMessage(tab.id, { type: "FP_APPLY", approvals });
  if (!res?.ok) {
    statusEl.textContent = "Apply failed.";
    return;
  }
  statusEl.textContent = `Done. Filled: ${res.audit?.filled ?? 0} | Blocked: ${res.audit?.blocked ?? 0}`;
});

render();
