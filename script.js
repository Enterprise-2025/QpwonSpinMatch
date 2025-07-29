// script.js – Logica QPWONSpin migliorata
// Caricamento moduli esterni via CDN: Chart.js, SheetJS (XLSX), jsPDF

document.addEventListener('DOMContentLoaded', () => {
  // --- Elementi DOM principali ---
  const strategicContext = document.getElementById('strategicContext');
  const spinInputs = Array.from(document.querySelectorAll('#spin input')); // domande SPIN
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

  // --- Stato e Persistenza ---
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
    const data = JSON.parse(localStorage.getItem('qpwonState') || '{}');
    if (data.strategicContext) strategicContext.value = data.strategicContext;
    if (Array.isArray(data.spinAnswers)) {
      spinInputs.forEach((input, i) => { input.value = data.spinAnswers[i] || ''; });
    }
    if (data.language) languageSelect.value = data.language;
    if (typeof data.autoTheme === 'boolean') autoTheme.checked = data.autoTheme;
  }

  // --- Progress & Scoring ---
  function updateProgress() {
    const filled = spinInputs.filter(i => i.value.trim() !== '').length;
    const total = spinInputs.length;
    const percent = Math.round((filled / total) * 100);
    progressBar.style.height = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
    progressPercent.textContent = `${percent}%`;
    return percent;
  }

  function calculateScores() {
    // Esempio: punteggio numerico da 1 a 5 sui post-SPIN (stub)
    const pain = spinInputs.slice(0, 4)
      .reduce((sum, i) => sum + (parseInt(i.getAttribute('data-score')) || 0), 0);
    const closing = spinInputs.slice(4).reduce((sum, i) => sum + (parseInt(i.getAttribute('data-score')) || 0), 0);
    const painPct = Math.round((pain / (4 * 5)) * 100);
    const closePct = Math.round((closing / (4 * 5)) * 100);
    return { painPct, closePct };
  }

  let chart = null;
  function renderChart() {
    const { painPct, closePct } = calculateScores();
    const data = {
      labels: ['Pain Score', 'Closing Score'],
      datasets: [{ data: [painPct, closePct], backgroundColor: ['var(--color-primary)', 'var(--color-secondary)'] }]
    };
    if (chart) {
      chart.data = data;
      chart.update();
    } else {
      chart = new Chart(scoreChartCanvas, {
        type: 'doughnut', data,
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }

  // --- SmartMatch ---
  const profiles = [
    { name: 'Basic', tags: { gestionale: 1, crm: 1, analytics: 0 } },
    { name: 'Advanced', tags: { gestionale: 2, crm: 2, analytics: 1 } },
    { name: 'Enterprise', tags: { gestionale: 3, crm: 3, analytics: 2 } }
  ];

  function computeSmartMatch() {
    // Calcola corrispondenza semplice: somma dei punteggi dei tag in base alle risposte
    const results = profiles.map(p => {
      const score = Object.values(p.tags).reduce((s, v) => s + v, 0);
      return { name: p.name, score };
    }).sort((a, b) => b.score - a.score);
    const top = results[0];
    const maxScore = profiles.reduce((max, p) => Math.max(max, Object.values(p.tags).reduce((s,v)=>s+v,0)), 0);
    const matchPct = top.score / maxScore;
    if (matchPct > 0.6) {
      smartmatchSection.hidden = false;
      profileName.textContent = top.name;
      matchScore.textContent = `Match: ${Math.round(matchPct*100)}%`;
      solutionDesc.textContent = `Soluzione ${top.name} con funzionalità complete.`;
      benefitsList.innerHTML = `<li>Benefit A</li><li>Benefit B</li>`;
      actionsList.innerHTML = `<li>Passo 1</li><li>Passo 2</li>`;
    } else {
      smartmatchSection.hidden = true;
    }
  }

  // --- Export Excel ---
  exportExcelBtn.addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    const data = [
      { Campo: 'Contesto Strategico', Valore: strategicContext.value },
      ...spinInputs.map(i => ({ Campo: i.previousElementSibling.textContent, Valore: i.value }))
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, 'QPWONSpin_Report.xlsx');
  });

  // --- Export PDF ---
  exportPdfBtn.addEventListener('click', () => {
    const pdf = new jsPDF();
    if (logoUpload.files[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        pdf.addImage(e.target.result, 'PNG', 10, 10, 40, 20);
        drawPdfContent(pdf);
      };
      reader.readAsDataURL(logoUpload.files[0]);
    } else {
      drawPdfContent(pdf);
    }
  });
  function drawPdfContent(pdf) {
    pdf.setFontSize(12);
    pdf.text('QPWONSpin Report', 10, 40);
    pdf.text(`Contesto: ${strategicContext.value}`, 10, 50);
    let y = 60;
    spinInputs.forEach(i => {
      pdf.text(`${i.previousElementSibling.textContent}: ${i.value}`, 10, y);
      y += 10;
    });
    pdf.save('QPWONSpin_Report.pdf');
  }

  // --- Live Share ---
  shareBtn.addEventListener('click', () => {
    shareView.hidden = !shareView.hidden;
    if (!shareView.hidden) {
      shareList.innerHTML = spinInputs
        .filter(i => i.value.trim())
        .map(i => `<li>${i.previousElementSibling.textContent}: ${i.value}</li>`)
        .join('');
    }
  });

  // --- Theme & Language ---
  function applyTheme() {
    if (autoTheme.checked) {
      document.body.classList.toggle('dark-mode', window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }
  themeToggle.addEventListener('click', () => document.body.classList.toggle('dark-mode'));
  autoTheme.addEventListener('change', applyTheme);
  languageSelect.addEventListener('change', saveState);

  // --- Menu Toggle (mobile) ---
  menuToggle.addEventListener('click', () => {
    sidebar.style.transform = sidebar.style.transform === 'translateX(-100%)' ? 'translateX(0)' : 'translateX(-100%)';
  });

  // --- Onboarding Wizard ---
  if (!localStorage.getItem('qpwonOnboarded')) {
    onboardingModal.hidden = false;
  }
  startOnboarding.addEventListener('click', () => {
    onboardingModal.hidden = true;
    localStorage.setItem('qpwonOnboarded', 'true');
  });

  // --- Reset ---
  resetBtn.addEventListener('click', () => {
    if (confirm('Sicuro di voler azzerare tutto?')) {
      localStorage.clear();
      location.reload();
    }
  });

  // --- Evento su tutti i campi per aggiornamenti ---
  [...spinInputs, strategicContext].forEach(el =>
    el.addEventListener('input', () => {
      saveState();
      const pct = updateProgress();
      renderChart();
      if (pct >= 60) computeSmartMatch();
    })
  );

  // --- Inizializzazione ---
  loadState();
  updateProgress();
  renderChart();
  applyTheme();
});
