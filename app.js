// ==========================
// 🔗 Google Apps Script URL
// ==========================
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz_mzulEZJF5PlhkGUzPXUX7u0Zjt784oHGnE-iI9lUBgAIrYl0VWOvPbWTUXgq_wcwgQ/exec";

// ==========================
// 🧠 STORAGE
// ==========================
const STORAGE_KEY = 'suandok-news-history-v1';

// ==========================
// 🎯 ELEMENT SELECTORS
// ==========================
const selectors = {
  respiratoryRate: document.getElementById('respiratoryRate'),
  spo2: document.getElementById('spo2'),
  oxygenSupport: document.getElementById('oxygenSupport'),
  temperature: document.getElementById('temperature'),
  systolicBP: document.getElementById('systolicBP'),
  heartRate: document.getElementById('heartRate'),
  consciousness: document.getElementById('consciousness'),

  totalScore: document.getElementById('totalScore'),
  urgencyLabel: document.getElementById('urgencyLabel'),
  redFlag: document.getElementById('redFlag'),

  saveBtn: document.getElementById('saveBtn'),
  resetBtn: document.getElementById('resetBtn'),

  location: document.getElementById('location'),
  hn: document.getElementById('hn')
};

// ==========================
// 🔢 คำนวณคะแนน
// ==========================
function calculateScore() {
  let score = 0;

  document.querySelectorAll("select").forEach(el => {
    score += parseInt(el.value || 0);
  });

  return score;
}

// ==========================
// 🚨 Risk Level
// ==========================
function getRiskLevel(score) {
  if (score >= 7) return "Emergent";
  if (score >= 5) return "Urgent";
  if (score >= 1) return "Low";
  return "Normal";
}

// ==========================
// 🔴 RED FLAG
// ==========================
function checkRedFlag() {
  let red = false;

  document.querySelectorAll("select").forEach(el => {
    if (parseInt(el.value) === 3) red = true;
  });

  return red;
}

// ==========================
// 📱 Update UI
// ==========================
function updateUI() {
  const score = calculateScore();
  const level = getRiskLevel(score);
  const red = checkRedFlag();

  if (selectors.totalScore) selectors.totalScore.innerText = score;
  if (selectors.urgencyLabel) selectors.urgencyLabel.innerText = level;
  if (selectors.redFlag) selectors.redFlag.innerText = red ? "พบ RED" : "ปกติ";
}

// ==========================
// 💾 Save Local
// ==========================
function saveLocal(data) {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history.push(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// ==========================
// ☁️ Save to Google Sheet
// ==========================
async function saveToGoogleSheet(score, level, note = "") {
  try {
    const res = await fetch(SHEET_WEBAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        score: score,
        level: level,
        note: note
      })
    });

    const text = await res.text();
    console.log("Response:", text);

    return JSON.parse(text);

  } catch (err) {
    console.error("ERROR:", err);
    throw err;
  }
}

// ==========================
// 💾 SAVE BUTTON
// ==========================
async function handleSave() {
  const score = calculateScore();
  const level = getRiskLevel(score);
  const red = checkRedFlag();

  const note = `
Location: ${selectors.location?.value || ""}
HN: ${selectors.hn?.value || ""}
RED: ${red}
Time: ${new Date().toLocaleString()}
  `;

  const data = { score, level, note };

  // save local
  saveLocal(data);

  try {
    await saveToGoogleSheet(score, level, note);
    alert("บันทึกลง Google Sheet สำเร็จ ✅");
  } catch (err) {
    alert("บันทึกในเครื่องสำเร็จ แต่ส่งไป Google Sheet ไม่สำเร็จ ❌");
  }
}

// ==========================
// 🔁 RESET
// ==========================
function handleReset() {
  document.querySelectorAll("select").forEach(el => el.value = 0);
  updateUI();
}

// ==========================
// 🚀 INIT
// ==========================
document.addEventListener("DOMContentLoaded", () => {

  // change event
  document.querySelectorAll("select").forEach(el => {
    el.addEventListener("change", updateUI);
  });

  // save button
  if (selectors.saveBtn) {
    selectors.saveBtn.addEventListener("click", handleSave);
  }

  // reset button
  if (selectors.resetBtn) {
    selectors.resetBtn.addEventListener("click", handleReset);
  }

  updateUI();
});