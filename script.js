// script.js – Logica dettagliata per QPWONSpin
// Dipendenze caricate via CDN: Chart.js (global Chart), SheetJS XLSX (global XLSX), jsPDF (global window.jspdf.jsPDF)

// Wrapping tutto dentro DOMContentLoaded per essere sicuri che il DOM sia pronto
window.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTI DOM PRINCIPALI ---
  const strategicContext = document.getElementById('strategicContext'); // textarea contesto
  const spinInputs = Array.from(document.querySelectorAll('#spin input')); // tutti gli input SPIN
  const progressBar = document.getElementById('progressBar'); // barra verticale
  const progressPercent = document.getElementById('progressPercent'); // percentuale testuale

  const shareBtn = document.getElementById('toggleShareView'); // toggle Live Share
  const shareView = document.getElementById('shareView');
  const shareList = document.getElementById('shareList');

  const smartmatchSection = document.getElementById('smartmatch'); // sezione SmartMatch
  const profileName = document.getElementById('profileName');
  const matchScore = document.getElementById('matchScore');
  const solutionDesc = document.getElementById('solutionDesc');
  const benefitsList = document.getElementById('benefitsList');
  const actionsList = document.getElementById('actionsList');

  const scoreChartCanvas = document.getElementById('scoreChart'); // canvas Chart.js
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
  // Salva lo stato corrente (contesto + risposte SPIN + impostazioni) in localStorage
  function saveState() {
    const state = {
      strategicContext: strategicContext.value,
      spinAnswers: spinInputs.map(input => input.value),
      language: languageSelect.value,
      autoTheme: autoTheme.checked
    };
    localStorage.setItem('qpwonState', JSON.stringify(state));
  }

  // Carica lo stato precedentemente salvato
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
  // Calcola e aggiorna la barra di progresso SPIN
  function updateProgress() {
    const filled = spinInputs.filter(i => i.value.trim() !== '').length;
    const total = spinInputs.length;
    const pct = Math.round((filled / total) * 100);
    progressBar.style.height = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', pct);
    progressPercent.textContent = `${pct}%`;
    return pct;
  }

  // Calcola Pain & Closing Score come percentuali
  function calculateScores() {
    // In questo esempio ogni input SPIN non-numerico ha data-score="0"
    const painSum = spinInputs.slice(0, 4)
      .reduce((sum, inp) => sum + Number(inp.getAttribute('data-score') || 0), 0);
    const closeSum = spinInputs.slice(4)
      .reduce((sum, inp) => sum + Number(inp.getAttribute('data-score') || 0), 0);
    const painPct = Math.round((painSum / (4 * 5)) * 100);
    const closePct = Math.round((closeSum / (4 * 5)) * 100);
    return { painPct, closePct };
  }

  let chart = null;
  // Rendering o aggiornamento del grafico Chart.js
  function renderChart() {
    const { painPct, closePct } = calculateScores();
    const data = {
      labels: ['Pain Score', 'Closing Score'],
      datasets: [{ data: [painPct, closePct], backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(), getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim()] }]
    };
    if (chart) {
      chart.data = data;
      chart.update();
    } else {
      chart = new Chart(scoreChartCanvas, { type: 'doughnut', data, options: { responsive: true, maintainAspectRatio: false } });
    }
  }

  // --- SMARTMATCH MECHANISM ---
  const profiles = [
    { name: 'Basic', tags: { gestionale: 1, crm: 0, analytics: 0 } },
    { name: 'Advanced', tags: { gestionale: 2, crm: 2, analytics: 1 } },
    { name: 'Enterprise', tags: { gestionale: 3, crm: 3, analytics: 2 } }
  ];

  function computeSmartMatch() {
    // Semplice somma dei pesi per demo
    const maxTotal = Math.max(...profiles.map(p => Object.values(p.tags).reduce((a,b)=>a+b,0)));
    const scored = profiles.map(p => {
      const total = Object.values(p.tags).reduce((a,b)=>a+b,0);
      return { name: p.name, score: total, matchPct: total / maxTotal };
    }).sort((a,b) => b.matchPct - a.matchPct);
    const top = scored[0];
    if (top.matchPct > 0.6) {
      smartmatchSection.hidden = false;
      profileName.textContent = top.name;
      matchScore.textContent = `Match: ${Math.round(top.matchPct * 100)}%`;
      solutionDesc.textContent = `Soluzione ${top.name} configurata per le tue esigenze.`;
      benefitsList.innerHTML = ['<li>Benefit A</li>', '<li>Benefit B</li>', '<li>Benefit C</li>'].join('');
      actionsList.innerHTML = ['<li>Fase 1: Analisi</li>', '<li>Fase 2: Proposta</li>'].join('');
    } else {
      smartmatchSection.hidden = true;
    }
  }

  // --- EXPORT EXCEL via SheetJS ---
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

  // --- EXPORT PDF via jsPDF ---
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


