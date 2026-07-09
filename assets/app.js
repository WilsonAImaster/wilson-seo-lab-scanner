const form = document.querySelector("#scanForm");
const siteUrl = document.querySelector("#siteUrl");
const scanButton = document.querySelector("#scanButton");
const humanCheck = document.querySelector("#humanCheck");
const humanLabel = document.querySelector("[data-human-label]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const result = document.querySelector("#result");
const scoreRing = document.querySelector("#scoreRing");
const scoreNumber = document.querySelector("#scoreNumber");
const reportId = document.querySelector("#reportId");
const gradeBadge = document.querySelector("#gradeBadge");
const gradeTitle = document.querySelector("#gradeTitle");
const gradeText = document.querySelector("#gradeText");
const dimensions = document.querySelector("#dimensions");
const issues = document.querySelector("#issues");
const issueTitle = document.querySelector("#issueTitle");
const issueDescription = document.querySelector("#issueDescription");
const issueBadge = document.querySelector("#issueBadge");
const evidenceBadge = document.querySelector("#evidenceBadge");
const scanEvidence = document.querySelector("#scanEvidence");
const toast = document.querySelector("#toast");

let humanVerified = false;

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function barColor(score) {
  if (score >= 80) return "#0f766e";
  if (score >= 62) return "#2563eb";
  return "#b42318";
}

function impactLabel(value) {
  if (value === "high") return "高影響";
  if (value === "medium") return "中影響";
  return "低影響";
}

function formatScannedAt(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-Hant", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function renderEvidence(scan) {
  const summary = scan.summary || {};
  const rows = [
    ["最終掃描 URL", scan.finalUrl || "-"],
    ["HTTP 狀態", `${scan.status || "-"} ${scan.status === 200 ? "OK" : ""}`.trim()],
    ["Content-Type", scan.contentType || "-"],
    ["回應時間", scan.responseMs ? `${scan.responseMs}ms` : "-"],
    ["掃描時間", formatScannedAt(scan.scannedAt)],
    ["Title", summary.title || "-"],
    ["Description", summary.description || "-"],
    ["H1", summary.h1 || "-"],
    ["Canonical", summary.canonical || "-"],
    ["Robots", summary.robots || "-"],
    ["Sitemap", summary.sitemap || "-"]
  ];

  evidenceBadge.textContent = "Verified";
  scanEvidence.innerHTML = rows
    .map(
      ([label, value]) => `
        <div class="evidence-item">
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `
    )
    .join("");
}

function renderDimensions(items = []) {
  dimensions.innerHTML = items
    .map(
      (item) => `
        <div class="dimension">
          <div>
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.helper)}</span>
          </div>
          <div class="bar"><i style="--bar-width:${Number(item.score) || 0}%; --bar-color:${barColor(Number(item.score) || 0)}"></i></div>
          <span class="dimension-score">${Number(item.score) || 0}</span>
        </div>
      `
    )
    .join("");
}

function renderIssues(items = []) {
  issues.innerHTML = items
    .map(
      (item, index) => `
        <article class="issue-row">
          <span class="issue-index">${index + 1}</span>
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p><strong>觀察：</strong>${escapeHtml(item.risk)}</p>
            <p><strong>下一步：</strong>${escapeHtml(item.fix)}</p>
            ${item.evidence ? `<span class="issue-evidence">${escapeHtml(item.evidence)}</span>` : ""}
          </div>
          <span class="impact ${escapeHtml(item.impact)}">${impactLabel(item.impact)}</span>
        </article>
      `
    )
    .join("");
}

function renderScan(scan) {
  const score = Number(scan.score) || 0;
  const grade = scan.grade || {};

  reportId.textContent = `REPORT ${scan.reportId || "OSL-LIVE"}`;
  scoreNumber.textContent = score;
  scoreRing.style.setProperty("--score-deg", `${score * 3.6}deg`);
  scoreRing.style.background = `conic-gradient(${grade.color || barColor(score)} ${score * 3.6}deg, #dbeafe 0deg)`;
  gradeBadge.textContent = grade.badge || "Grade";
  gradeTitle.textContent = grade.title || "掃描完成";
  gradeText.textContent = grade.text || "已取得實際首頁 SEO 訊號。";
  issueTitle.textContent = "優先修復項目";
  issueDescription.textContent = `已實際掃描 ${scan.finalUrl || siteUrl.value}，以下是最值得先處理的項目。`;
  issueBadge.textContent = `${(scan.issues || []).length} items`;

  renderEvidence(scan);
  renderDimensions(scan.dimensions || []);
  renderIssues(scan.issues || []);
  result.classList.add("is-visible");
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function runScan(url) {
  const response = await fetch("/api/lab-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, language: "zh" })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "掃描失敗，請稍後再試。");
  }
  return data;
}

humanCheck?.addEventListener("click", () => {
  humanVerified = true;
  humanCheck.setAttribute("aria-pressed", "true");
  humanLabel.textContent = "已確認，可以開始掃描";
  showToast("掃描確認已完成");
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = normalizeUrl(siteUrl.value);
  if (!url) return;
  if (!humanVerified) {
    showToast("請先點選人機確認");
    humanCheck?.focus();
    return;
  }

  scanButton.disabled = true;
  scanButton.textContent = "真實掃描中...";
  try {
    renderScan(await runScan(url));
    showToast("Lab Scan 已完成");
  } catch (error) {
    showToast(error.message);
  } finally {
    scanButton.disabled = false;
    scanButton.textContent = "重新掃描";
  }
});

themeToggle?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  themeToggle.textContent = next === "dark" ? "Day" : "Night";
});
