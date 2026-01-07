# FormPilot AI

**FormPilot AI** is a lightweight Chrome browser extension designed to intelligently assist with form autofill, validation, and context-aware data handling.

Rather than acting as a simple autofill tool, FormPilot AI demonstrates how browser-based logic, rules, and user context can be combined to improve accuracy, reduce user friction, and prevent common data entry mistakes.

This project was built as a **portfolio demo** to showcase applied AI thinking, browser extension architecture, and real-world UX design — not as a production SaaS.

---

## 🔍 What FormPilot AI Does

FormPilot AI helps users interact with web forms more intelligently by:

- Identifying form fields on active webpages
- Applying rule-based logic to suggest or validate inputs
- Preventing unsafe or inconsistent autofill behavior
- Remembering user preferences across sessions
- Providing a clean popup interface for user control

While the current version uses deterministic rules, the architecture is intentionally designed to support future AI or LLM-powered enhancements.

---

## 🧠 Why This Project Exists

Many AI demos focus on chat interfaces or API wrappers.

FormPilot AI focuses on **applied intelligence inside the browser**, where real users interact with real systems.

This project demonstrates:
- Systems thinking over toy prompts
- Practical UX decisions in constrained environments
- Trust and safety considerations for automated actions
- Human-in-the-loop control for AI-assisted workflows

---

## 🛠️ Tech & Architecture

- **Chrome Extension (Manifest v3)**
- Vanilla JavaScript (no frameworks)
- Popup UI with HTML/CSS
- Rule-based logic engine
- Local storage for state persistence

Key files:
- `manifest.json` – Extension configuration and permissions
- `popup.html / popup.css / popup.js` – User interface
- `content.js` – Page-level interaction logic
- `rules.js` – Autofill and validation rules
- `storage.js` – Persistent user preferences

---

## 🚀 How to Run Locally

1. Clone or download this repository
2. Open Chrome and navigate to: chrome://extensions/
