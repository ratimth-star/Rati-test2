const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz_mzulEZJF5PlhkGUzPXUX7u0Zjt784oHGnE-iI9lUBgAIrYl0VWOvPbWTUXgq_wcwgQ/exec";
const STORAGE_KEY = "suandok-news-history-v2";

const SPO2_OPTIONS = {
  1: [
    { label: "-- เลือก --", value: "" },
    { label: "≤91 (3)", value: "3" },
    { label: "92–93 (2)", value: "2" },
    { label: "94–95 (1)", value: "1" },
    { label: "≥96 (0)", value: "0" }
  ],
  2: [
    { label: "-- เลือก --", value: "" },
    { label: "≤83 (3)", value: "3" },
    { label: "84–85 (2)", value: "2" },
    { label: "86–87 (1)", value: "1" },
    { label: "88–92 (0)", value: "0" },
    { label: "≥93 (3)", value: "3" }
  ]
};

const ADVICE_MAP = {
  Normal: {
    title: "Normal (0 คะแนน)",
    items: [
      "ติดตามอาการตามรอบปกติของหน่วยงาน",
      "บันทึกสัญญาณชีพตามมาตรฐาน",
      "หากอาการเปลี่ยนแปลง ให้ประเมินซ้ำทันที"
    ]
  },
  Low: {
    title: "Low Risk (1–4 คะแนน)",
    items: [
      "เพิ่มความถี่ในการติดตามสัญญาณชีพ",
      "แจ้งพยาบาลวิชาชีพหรือผู้รับผิดชอบประจำเวร",
      "ประเมินซ้ำตามความเหมาะสมและดูแนวโน้มอาการ"
    ]
  },
  Urgent: {
    title: "Urgent (5–6 คะแนน)",
    items: [
      "แจ้งแพทย์หรือทีมที่เกี่ยวข้องโดยเร็ว",
      "พิจารณาเฝ้าระวังใกล้ชิดและประเมินซ้ำถี่ขึ้น",
      "เตรียมอุปกรณ์และแผนการดูแลหากอาการทรุดลง"
    ]
  },
  Emergent: {
    title: "Emergent (≥7 คะแนน)",
    items: [
      "แจ้งแพทย์และทีมฉุกเฉินทันที",
      "เฝ้าระวังต่อเนื่องและเตรียมการช่วยเหลือขั้นสูง",
      "ประเมิน Airway, Breathing, Circulation และดำเนินการตามแนวทางหน่วยงาน"
    ]
  }
};

const selectors = {
  respiratoryRate: document.getElementById("respiratoryRate"),
  spo2: document.getElementById("spo2"),
  oxygenSupport: document.getElementById("oxygenSupport"),
  temperature: document.getElementById("temperature"),
  systolicBP: document.getElementById("systolicBP"),
  heartRate: document.getElementById("heartRate"),
  consciousness: document.getElementById("consciousness"),
  location: document.getElementById("location"),
  hn: document.getElementById("hn"),
  assessmentTime: document.getElementById("assessmentTime"),
  nurseNote: document.getElementById("nurseNote"),
  totalScore: document.getElementById("totalScore"),
  urgencyLabel: document.getElementById("urgencyLabel"),
  redFlag: document.getElementById("redFlag"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  resetBtnTop: document.getElementById("resetBtnTop"),
  saveStatus: document.getElementById("saveStatus"),
  adviceBox: document.getElementById("adviceBox"),
  historyTable: document.getElementById("historyTable"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  installBtn: document.getElementById("installBtn"),
  scoreStateTag: document.getElementById("scoreStateTag")
};

let deferredPrompt = null;

function setDefaultAssessmentTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  selectors.assessmentTime.value = now.toISOString().slice(0, 16);
}

function renderSpo2Options(scale = "1") {
  const currentValue = selectors.spo2.value;
  selectors.spo2.innerHTML = SPO2_OPTIONS[scale]
    .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
    .join("");

  if (SPO2_OPTIONS[scale].some(opt => opt.value === currentValue)) {
    selectors.spo2.value = currentValue;
  }
}

function calculateScore() {
  return Array.from(document.querySelectorAll(".score-input")).reduce((sum, el) => {
    return sum + Number.parseInt(el.value || 0, 10);
  }, 0);
}

function getRiskLevel(score) {
  if (score >= 7) return "Emergent";
  if (score >= 5) return "Urgent";
  if (score >= 1) return "Low";
  return "Normal";
}

function checkRedFlag() {
  return Array.from(document.querySelectorAll(".score-input")).some(el => Number.parseInt(el.value || 0, 10) === 3);
}

function getUrgencyClass(level) {
  switch (level) {
    case "Emergent": return "critical";
    case "Urgent": return "high";
    case "Low": return "mid";
    default: return "low";
  }
}

function updateAdvice(level, red) {
  const advice = ADVICE_MAP[level] || ADVICE_MAP.Normal;
  const extra = red ? '<div class="alert alert-danger mt-3 mb-0 py-2 px-3">พบค่า RED score อย่างน้อย 1 รายการ ควรประเมินซ้ำและแจ้งทีมดูแลตามแนวทางหน่วยงาน</div>' : "";

  selectors.adviceBox.innerHTML = `
    <div class="advice-card">
      <h3>${advice.title}</h3>
      <ul>
        ${advice.items.map(item => `<li>${item}</li>`).join("")}
      </ul>
      ${extra}
    </div>
  `;
}

function updateUI() {
  const score = calculateScore();
  const level = getRiskLevel(score);
  const red = checkRedFlag();
  const urgencyClass = getUrgencyClass(level);

  selectors.totalScore.textContent = score;
  selectors.urgencyLabel.textContent = level;
  selectors.urgencyLabel.className = `status-pill ${urgencyClass}`;
  selectors.redFlag.textContent = red ? "พบ RED" : "ไม่พบ";
  selectors.redFlag.className = `status-pill ${red ? "danger" : "neutral"}`;
  selectors.scoreStateTag.textContent = red ? "ติดตามใกล้ชิด" : score === 0 ? "พร้อมประเมิน" : "กำลังประเมิน";
  selectors.scoreStateTag.className = `badge rounded-pill px-3 py-2 ${red ? "text-bg-danger" : score === 0 ? "text-bg-secondary" : "text-bg-info"}`;

  updateAdvice(level, red);
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocal(data) {
  const history = getHistory();
  history.unshift(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
}

function formatDateTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderHistory() {
  const history = getHistory();

  if (!history.length) {
    selectors.historyTable.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-secondary-light py-4">ยังไม่มีประวัติการบันทึก</td>
      </tr>
    `;
    return;
  }

  selectors.historyTable.innerHTML = history.map(item => `
    <tr>
      <td>${escapeHtml(item.location || "-")}</td>
      <td>${escapeHtml(item.hn || "-")}</td>
      <td><span class="badge text-bg-dark border">${item.score}</span></td>
      <td>${escapeHtml(item.level)}</td>
      <td>${escapeHtml(formatDateTime(item.assessmentTime || item.savedAt))}</td>
    </tr>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(message, type = "info") {
  selectors.saveStatus.textContent = message;
  selectors.saveStatus.className = `save-status ${type}`;
}

async function saveToGoogleSheet(payload) {
  const res = await fetch(SHEET_WEBAPP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function handleSave() {
  const score = calculateScore();
  const level = getRiskLevel(score);
  const red = checkRedFlag();

  const data = {
    location: selectors.location.value.trim(),
    hn: selectors.hn.value.trim(),
    assessmentTime: selectors.assessmentTime.value,
    note: selectors.nurseNote.value.trim(),
    score,
    level,
    red,
    savedAt: new Date().toISOString(),
    spo2Scale: document.querySelector(".spo2-scale:checked")?.value || "1"
  };

  saveLocal(data);
  renderHistory();
  setStatus("บันทึกลงเครื่องสำเร็จ กำลังส่งข้อมูลไป Google Sheet...", "info");

  try {
    await saveToGoogleSheet(data);
    setStatus("บันทึกลงเครื่องและส่งไป Google Sheet สำเร็จ", "success");
  } catch (error) {
    console.error(error);
    setStatus("บันทึกลงเครื่องสำเร็จ แต่ส่งไป Google Sheet ไม่สำเร็จ", "error");
  }
}

function resetForm() {
  document.querySelectorAll(".score-input").forEach(el => {
    el.value = "";
  });
  selectors.location.value = "";
  selectors.hn.value = "";
  selectors.nurseNote.value = "";
  document.getElementById("scale1").checked = true;
  renderSpo2Options("1");
  setDefaultAssessmentTime();
  setStatus("รีเซ็ตข้อมูลเรียบร้อย", "info");
  updateUI();
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  setStatus("ล้างประวัติเรียบร้อย", "info");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(console.error);
    });
  }
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    selectors.installBtn.classList.remove("d-none");
  });

  selectors.installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    selectors.installBtn.classList.add("d-none");
  });
}

function init() {
  setDefaultAssessmentTime();
  renderSpo2Options("1");
  renderHistory();
  updateUI();
  registerServiceWorker();
  setupInstallPrompt();

  document.querySelectorAll(".score-input").forEach(el => {
    el.addEventListener("change", updateUI);
  });

  document.querySelectorAll(".spo2-scale").forEach(el => {
    el.addEventListener("change", (event) => {
      renderSpo2Options(event.target.value);
      updateUI();
    });
  });

  selectors.saveBtn.addEventListener("click", handleSave);
  selectors.resetBtn.addEventListener("click", resetForm);
  selectors.resetBtnTop.addEventListener("click", resetForm);
  selectors.clearHistoryBtn.addEventListener("click", clearHistory);
}

document.addEventListener("DOMContentLoaded", init);
