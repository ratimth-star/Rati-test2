const STORAGE_KEY = 'suandok-news-history-v1';
const SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbz_mzulEZJF5PlhkGUzPXUX7u0Zjt784oHGnE-iI9lUBgAIrYl0VWOvPbWTUXgq_wcwgQ/exec';
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
  adviceBox: document.getElementById('adviceBox'),
  historyTable: document.getElementById('historyTable'),
  saveBtn: document.getElementById('saveBtn'),
  resetBtn: document.getElementById('resetBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  location: document.getElementById('location'),
  hn: document.getElementById('hn'),
  assessmentTime: document.getElementById('assessmentTime'),
  installBtn: document.getElementById('installBtn'),
  saveStatus: document.getElementById('saveStatus')
};

const options = {
  respiratoryRate: [
    ['≤8 (+3)', 3], ['9-11 (+1)', 1], ['12-20 (0)', 0], ['21-24 (+2)', 2], ['≥25 (+3)', 3]
  ],
  oxygenSupport: [['ไม่มี (0)', 0], ['มี (+2)', 2]],
  temperature: [['≤35°C (+3)', 3], ['35.1-36°C (+1)', 1], ['36.1-38°C (0)', 0], ['38.1-39°C (+1)', 1], ['≥39.1°C (+2)', 2]],
  systolicBP: [['≤90 (+3)', 3], ['91-100 (+2)', 2], ['101-110 (+1)', 1], ['111-219 (0)', 0], ['≥220 (+3)', 3]],
  heartRate: [['≤40 (+3)', 3], ['41-50 (+1)', 1], ['51-90 (0)', 0], ['91-110 (+1)', 1], ['111-130 (+2)', 2], ['≥131 (+3)', 3]],
  consciousness: [['รู้สึกตัวดี (A) (0)', 0], ['V / P / U (+3)', 3]]
};

const spo2ScaleOptions = {
  1: [['≤91% (+3)', 3], ['92-93% (+2)', 2], ['94-95% (+1)', 1], ['≥96% (0)', 0]],
  2: [['≤83% (+3)', 3], ['84-85% (+2)', 2], ['86-87% (+1)', 1], ['88-92% หรือ ≥93% Air (0)', 0], ['93-94% O₂ (+1)', 1], ['95-96% O₂ (+2)', 2], ['≥97% O₂ (+3)', 3]]
};

const adviceLookup = [
  { min: 0, max: 2, label: 'Non Urgent', className: 'low', title: 'Non Urgent ไม่เร่งด่วน', items: ['ให้การดูแลตรวจสอบอาการทั่วไป', 'แนะนำขั้นตอนการรับบริการ', 'ติดตามอาการตามปกติ'] },
  { min: 3, max: 4, label: 'Less Urgent', className: 'mid', title: 'Less Urgent เร่งด่วนน้อย', items: ['รายงานพยาบาลเพื่อประเมินซ้ำ', 'พิจารณาให้พบแพทย์ภายใน 30 นาที', 'เฝ้าระวังอาการเปลี่ยนแปลง'] },
  { min: 5, max: 6, label: 'Urgent', className: 'high', title: 'Urgent เร่งด่วน', items: ['แจ้งพยาบาลเพื่อประเมินอาการซ้ำ', 'พิจารณาส่งต่อห้องฉุกเฉิน ER', 'ติดตามอาการอย่างใกล้ชิด'] },
  { min: 7, max: Infinity, label: 'Emergent', className: 'critical', title: 'Emergent ฉุกเฉิน', items: ['แจ้งพยาบาลและแพทย์ทันที', 'ส่งต่อผู้ป่วยเพื่อการดูแลขั้นวิกฤต', 'เตรียมอุปกรณ์ฉุกเฉินที่จำเป็น'] }
];

function populateSelect(selectEl, items) {
  selectEl.innerHTML = '';
  items.forEach(([label, score]) => {
    const option = document.createElement('option');
    option.value = score;
    option.textContent = label;
    selectEl.appendChild(option);
  });
}

function initializeForm() {
  Object.entries(options).forEach(([key, values]) => populateSelect(selectors[key], values));
  updateSpo2Options();
  selectors.assessmentTime.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function updateSpo2Options() {
  const scale = document.querySelector('input[name="spo2Scale"]:checked').value;
  populateSelect(selectors.spo2, spo2ScaleOptions[scale]);
  calculateScore();
}

function calculateScore() {
  const values = [
    Number(selectors.respiratoryRate.value),
    Number(selectors.spo2.value),
    Number(selectors.oxygenSupport.value),
    Number(selectors.temperature.value),
    Number(selectors.systolicBP.value),
    Number(selectors.heartRate.value),
    Number(selectors.consciousness.value)
  ];

  const total = values.reduce((sum, value) => sum + value, 0);
  const hasRed = values.some(value => value === 3);
  const advice = adviceLookup.find(item => total >= item.min && total <= item.max);

  selectors.totalScore.textContent = total;
  selectors.urgencyLabel.textContent = advice.label;
  selectors.urgencyLabel.className = `urgency-pill ${advice.className}`;
  selectors.redFlag.textContent = hasRed ? 'พบ RED' : 'ไม่พบ';
  selectors.redFlag.className = `red-flag ${hasRed ? 'yes' : 'no'}`;

  const adviceItems = [...advice.items];
  if (hasRed) {
    adviceItems.push('กรณีพบ RED Score: แจ้งพยาบาลทันทีเพื่อประเมินซ้ำ และติดตามอาการอย่างใกล้ชิด');
  }

  selectors.adviceBox.innerHTML = `
    <h3>${advice.title}</h3>
    <ul>${adviceItems.map(item => `<li>${item}</li>`).join('')}</ul>
  `;

  return { total, advice, hasRed };
}

function readHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function writeHistory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderHistory() {
  const items = readHistory();
  selectors.historyTable.innerHTML = '';

  if (!items.length) {
    selectors.historyTable.innerHTML = '<tr class="empty-row"><td colspan="5">ยังไม่มีข้อมูลที่บันทึก</td></tr>';
    return;
  }

  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.location || '-'}</td>
      <td>${item.hn || '-'}</td>
      <td>${item.score}</td>
      <td>${item.urgency}</td>
      <td>${new Date(item.time).toLocaleString('th-TH')}</td>
    `;
    selectors.historyTable.appendChild(tr);
  });
}

function setSaveStatus(message, type = 'info') {
  if (!selectors.saveStatus) return;
  selectors.saveStatus.textContent = message;
  selectors.saveStatus.className = `save-status ${type}`;
}

async function saveToGoogleSheet(entry) {
  const noteParts = [];
  if (entry.location) noteParts.push(`Location: ${entry.location}`);
  if (entry.hn) noteParts.push(`HN: ${entry.hn}`);
  if (entry.hasRed) noteParts.push('RED score');
  noteParts.push(`Assessment time: ${entry.time}`);

  const payload = {
    score: entry.score,
    level: entry.urgency,
    note: noteParts.join(' | ')
  };

  const response = await fetch(SHEET_WEBAPP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function saveRecord() {
  const { total, advice, hasRed } = calculateScore();
  const entry = {
    location: selectors.location.value.trim(),
    hn: selectors.hn.value.trim(),
    score: total,
    urgency: hasRed ? `${advice.label} / RED` : advice.label,
    hasRed,
    time: selectors.assessmentTime.value || new Date().toISOString()
  };

  const items = readHistory();
  items.unshift(entry);
  writeHistory(items.slice(0, 50));
  renderHistory();

  selectors.saveBtn.disabled = true;
  setSaveStatus('กำลังบันทึกข้อมูล...', 'info');

  try {
    await saveToGoogleSheet(entry);
    setSaveStatus('บันทึกลง Google Sheet สำเร็จแล้ว', 'success');
  } catch (error) {
    console.error('Save to Google Sheet failed:', error);
    setSaveStatus('บันทึกในเครื่องสำเร็จ แต่ส่งไป Google Sheet ไม่สำเร็จ', 'error');
  } finally {
    selectors.saveBtn.disabled = false;
  }
}

function resetForm() {
  selectors.location.value = '';
  selectors.hn.value = '';
  document.querySelector('input[name="spo2Scale"][value="1"]').checked = true;
  initializeForm();
  calculateScore();
  setSaveStatus('');
}

selectors.saveBtn.addEventListener('click', saveRecord);
selectors.resetBtn.addEventListener('click', resetForm);
selectors.clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  setSaveStatus('ล้างประวัติในเครื่องแล้ว', 'info');
});

document.querySelectorAll('select, input[name="spo2Scale"]').forEach(el => {
  el.addEventListener('change', () => {
    if (el.name === 'spo2Scale') updateSpo2Options();
    else calculateScore();
  });
});

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  selectors.installBtn.classList.remove('hidden');
});

selectors.installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  selectors.installBtn.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

initializeForm();
calculateScore();
renderHistory();
