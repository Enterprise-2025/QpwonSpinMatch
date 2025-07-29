// script.js – Logica completa e dettagliata per QPWONSpin
// Dipendenze caricate via CDN: Chart.js (global Chart), SheetJS XLSX (global XLSX), jsPDF (global window.jspdf.jsPDF)

window.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTI DOM PRINCIPALI ---
  const strategicContext = document.getElementById('strategicContext');
  const spinInputs = Array.from(document.querySelectorAll('#spin input'));
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');

  const shareBtn = document.getElementById('toggleShareView');
  const shareView = document.getElementById('shareView');
  const shareList = document.getElementById('shareList');

  const smartmatchSection = document.getElementById('smartmatch');
  const profileName = document.getElementById('profileName');
  const matchScore = document.getElementById('matchScore');
  const solutionDesc = document.getElementById('solutionDesc');
  const benefitsList = document.getElementById('benefitsList');
  const actionsList = document.getElementById('actionsList');

  const scoreChartCanvas = document.getElementById('scoreChart');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const logoUpload = document.getElementById('logoUpload');

  const languageSelect = document.getElementById('languageSelect');
  const themeToggle = document.getElementById('themeToggle');
  const autoTheme = document.getElementById('autoTheme');

  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');

  const resetBtn = document.getElementById('resetBtn');

  const onboardingModal = document.getElementById('onboardingModal');
  const startOnboarding = document.getElementById('startOnboarding');

  // --- STATO E PERSISTENZA ---
  function saveState() {
    const state = {
      strategicContext: strategicContext.value,
      spinAnswers: spinInputs.map(i => i.value),
      language: languageSelect.value,
      autoTheme: autoTheme.checked
    };
    localStorage.setItem('qpwonState', JSON.stringify(state));
  }

  function loadState() {
    const raw = localStorage.getItem('qpwonState');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.strategicContext) strategicContext.value = data.strategicContext;
      if (Array.isArray(data.spinAnswers)) {
        data.spinAnswers.forEach((val, idx) => {
          if (spinInputs[idx]) spinInputs[idx].value = val;
        });
      }
      if (data.language) languageSelect.value = data.language;
      if (typeof data.autoTheme === 'boolean') autoTheme.checked = data.autoTheme;
    } catch (e) {
      console.warn('Errore parsing stato:', e);
    }
  }

  // --- PROGRESS BAR & SCORING ---
  function updateProgress() {
    const filled = spinInputs.filter(i => i.value.trim() !== '').length;
    const total = spinInputs.length;
    const pct = Math.round((filled / total) * 100);
    progressBar.style.height = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', pct);
    progressPercent.textContent = `${pct}%`;
    return pct;
  }

  function calculateScores() {
    const painSum = spinInputs.slice(0, 4).reduce((sum, inp) => sum + Number(inp.getAttribute('data-score') || 0), 0);
    const closeSum = spinInputs.slice(4).reduce((sum, inp) => sum + Number(inp.getAttribute('data-score') || 0), 0);
    const painPct = Math.round((painSum / (4 * 5)) * 100);
    const closePct = Math.round((closeSum / (4 * 5)) * 100);
    return { painPct, closePct };
  }

  let chart = null;
  function renderChart() {
    const { painPct, closePct } = calculateScores();
    const colors = [
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim()
    ];
    const data = {
      labels: ['Pain Score', 'Closing Score'],
      datasets: [{ data: [painPct, closePct], backgroundColor: colors }]
    };
    if (chart) {
      chart.data = data;
      chart.update();
    } else {
      chart = new Chart(scoreChartCanvas, { type: 'doughnut', data, options: { responsive: true, maintainAspectRatio: false } });
    }
  }

  // --- SMARTMATCH ---
  const profiles = [
    { name: 'Basic', tags: { gestionale: 1, crm: 0, analytics: 0 } },
    { name: 'Advanced', tags: { gestionale: 2, crm: 2, analytics: 1 } },
    { name: 'Enterprise', tags: { gestionale: 3, crm: 3, analytics: 2 } }
  ];

  function computeSmartMatch() {
    const maxTotal = Math.max(...profiles.map(p => Object.values(p.tags).reduce((a,b)=>a+b,0)));
    const scored = profiles.map(p => {
      const total = Object.values(p.tags).reduce((a,b)=>a+b,0);
      return { ...p, total, matchPct: total / maxTotal };
    }).sort((a,b) => b.matchPct - a.matchPct);
    const top = scored[0];
    if (top.matchPct > 0.6) {
      smartmatchSection.hidden = false;
      profileName.textContent = top.name;
      matchScore.textContent = `Match: ${Math.round(top.matchPct * 100)}%`;
      solutionDesc.textContent = `Soluzione ${top.name} configurata per le tue esigenze.`;
      benefitsList.innerHTML = '<li>Benefit A</li><li>Benefit B</li><li>Benefit C</li>';
      actionsList.innerHTML = '<li>Fase 1: Analisi</li><li>Fase 2: Proposta</li>';
    } else {
      smartmatchSection.hidden = true;
    }
  }

  // --- EXPORT EXCEL ---
  exportExcelBtn.addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ['Campo', 'Valore'],
      ['Contesto Strategico', strategicContext.value],
      ...spinInputs.map(i => [i.previousElementSibling.textContent, i.value])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, 'QPWONSpin_Report.xlsx');
  });

  // --- EXPORT PDF ---
  function drawPdfContent(pdf, logoData) {
    let y = 20;
    pdf.setFontSize(16);
    pdf.text('QPWONSpin Report', 10, y);
    y += 10;
    if (logoData) {
      pdf.addImage(logoData, 'PNG', 150, 10, 40, 20);
      y += 20;
    }
    pdf.setFontSize(12);
    pdf.text(`Contesto: ${strategicContext.value}`, 10, y);
    y += 10;
    spinInputs.forEach(i => {
      pdf.text(`${i.previousElementSibling.textContent}: ${i.value}`, 10, y);
      y += 8;
    });
    pdf.save('QPWONSpin_Report.pdf');
  }

  exportPdfBtn.addEventListener('click', () => {
    const pdf = new window.jspdf.jsPDF();
    if (logoUpload.files[0]) {
      const reader = new FileReader();
      reader.onload = e => drawPdfContent(pdf, e.target.result);
      reader.readAsDataURL(logoUpload.files[0]);
    } else {
      drawPdfContent(pdf, null);
    }
  });

  // --- LIVE SHARE ---
  shareBtn.addEventListener('click', () => {
    shareView.hidden = !shareView.hidden;
    if (!shareView.hidden) {
      shareList.innerHTML = spinInputs
        .filter(i => i.value.trim())
        .map(i => `<li>${i.previousElementSibling.textContent}: ${i.value}</li>`)
        .join('');
    }
  });

  // --- THEME & LANGUAGE ---
  function applyTheme() {
    if (autoTheme.checked) {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark-mode', dark);
    }
  }
  themeToggle.addEventListener('click', () => document.body.classList.toggle('dark-mode'));
  autoTheme.addEventListener('change', () => { applyTheme(); saveState(); });
  languageSelect.addEventListener('change', saveState);

  // --- MENU MOBILE ---
  menuToggle.addEventListener('click', () => {
    sidebar.style.transform = sidebar.style.transform === 'translateX(-100%)' ? 'translateX(0)' : 'translateX(-100%)';
  });

  // --- ONBOARDING WIZARD ---
  if (!localStorage.getItem('qpwonOnboarded')) {
    onboardingModal.hidden = false;
  }
  startOnboarding.addEventListener('click', () => {
    onboardingModal.hidden = true;
    localStorage.setItem('qpwonOnboarded', 'true');
  });

  // --- RESET ---
  resetBtn.addEventListener('click', () => {
    if (confirm('Sicuro di voler azzerare tutto?')) {
      localStorage.clear();
      location.reload();
    }
  });

  // --- BIND UPDATE EVENTS ---
  [...spinInputs, strategicContext].forEach(el => {
    el.addEventListener('input', () => {
      saveState();
      const pct = updateProgress();
      renderChart();
      if (pct >= 60) computeSmartMatch();
    });
  });

  // --- INIZIALIZZAZIONE ALL'AVVIO ---
  loadState();
  updateProgress();
  renderChart();
  applyTheme();
});
