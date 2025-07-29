// script.js – Logica completa e dettagliata per QPWONSpin
// Dipendenze via CDN: Chart.js, SheetJS (XLSX), jsPDF

window.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTI DOM ---
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

  // --- PERSISTENZA STATO ---
  function saveState() {
    const state = {
      strategicContext: strategicContext?.value || '',
      spinAnswers: spinInputs.map(i => i.value),
      language: languageSelect?.value || '',
      autoTheme: autoTheme?.checked || false
    };
    localStorage.setItem('qpwonState', JSON.stringify(state));
  }

  function loadState() {
    const raw = localStorage.getItem('qpwonState');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.strategicContext && strategicContext) strategicContext.value = data.strategicContext;
      if (Array.isArray(data.spinAnswers)) {
        data.spinAnswers.forEach((val, i) => { if (spinInputs[i]) spinInputs[i].value = val; });
      }
      if (data.language && languageSelect) languageSelect.value = data.language;
      if (typeof data.autoTheme === 'boolean' && autoTheme) autoTheme.checked = data.autoTheme;
    } catch(e) { console.warn('Parse stato fallito', e); }
  }

  // --- PROGRESSO SPIN ---
  function updateProgress() {
    const filled = spinInputs.filter(i => i.value.trim() !== '').length;
    const pct = Math.round((filled / spinInputs.length) * 100);
    if (progressBar) { progressBar.style.height = pct + '%'; progressBar.setAttribute('aria-valuenow', pct); }
    if (progressPercent) progressPercent.textContent = `${pct}%`;
    return pct;
  }

  // --- GRAFICO PUNTEGGI ---
  function calculateScores() {
    const pain = spinInputs.slice(0,4).reduce((s,i) => s + Number(i.dataset.score||0), 0);
    const close = spinInputs.slice(4).reduce((s,i) => s + Number(i.dataset.score||0), 0);
    return { painPct: Math.round((pain/(4*5))*100), closePct: Math.round((close/(4*5))*100) };
  }

  let chart;
  function renderChart() {
    if (!scoreChartCanvas) return;
    const { painPct, closePct } = calculateScores();
    const colors = [
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim()
    ];
    const data = { labels:['Pain','Closing'], datasets:[{ data:[painPct,closePct], backgroundColor: colors }] };
    if (chart) { chart.data = data; chart.update(); }
    else { chart = new Chart(scoreChartCanvas, { type:'doughnut', data, options:{responsive:true,maintainAspectRatio:false} }); }
  }

  // --- SMARTMATCH ---
  const profiles = [
    {name:'Basic',tags:{gestionale:1,crm:0,analytics:0}},
    {name:'Advanced',tags:{gestionale:2,crm:2,analytics:1}},
    {name:'Enterprise',tags:{gestionale:3,crm:3,analytics:2}}
  ];
  function computeSmartMatch() {
    if (!smartmatchSection) return;
    const max = Math.max(...profiles.map(p=>Object.values(p.tags).reduce((a,b)=>a+b,0)));
    const scored = profiles.map(p=>{const t=Object.values(p.tags).reduce((a,b)=>a+b,0);return{...p,total:t,match:t/max};}).sort((a,b)=>b.match-a.match);
    const top = scored[0];
    if (top.match>0.6) {
      smartmatchSection.hidden = false;
      profileName.textContent = top.name;
      matchScore.textContent = `Match: ${Math.round(top.match*100)}%`;
      solutionDesc.textContent = `Soluzione ${top.name} pronta.`;
      benefitsList.innerHTML='<li>Vantaggio A</li><li>Vantaggio B</li>';
      actionsList.innerHTML='<li>Passo 1</li><li>Passo 2</li>';
    } else smartmatchSection.hidden=true;
  }

  // --- EXPORT EXCEL ---
  if (exportExcelBtn) exportExcelBtn.addEventListener('click', ()=>{
    const wb=XLSX.utils.book_new();
    const rows=[['Campo','Valore'],['Contesto',strategicContext?.value||''],...spinInputs.map(i=>[i.previousElementSibling.textContent,i.value])];
    const ws=XLSX.utils.aoa_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,'Report');XLSX.writeFile(wb,'Report.xlsx');
  });

  // --- EXPORT PDF ---
  function drawPdf(pdf,logo){let y=20;pdf.setFontSize(16);pdf.text('Report',10,y);y+=10;if(logo)pdf.addImage(logo,'PNG',150,10,40,20),y+=20;pdf.setFontSize(12);pdf.text(`Contesto: ${strategicContext?.value||''}`,10,y);y+=10;spinInputs.forEach(i=>{pdf.text(`${i.previousElementSibling.textContent}: ${i.value}`,10,y);y+=8;});pdf.save('Report.pdf');}
  if(exportPdfBtn)exportPdfBtn.addEventListener('click',()=>{const pdf=new window.jspdf.jsPDF();if(logoUpload?.files[0]){const r=new FileReader();r.onload=e=>drawPdf(pdf,e.target.result);r.readAsDataURL(logoUpload.files[0]);}else drawPdf(pdf,null);});

  // --- LIVE SHARE ---
  if(shareBtn)shareBtn.addEventListener('click',()=>{shareView.hidden=!shareView.hidden;if(!shareView.hidden)shareList.innerHTML=spinInputs.filter(i=>i.value.trim()).map(i=>`<li>${i.previousElementSibling.textContent}: ${i.value}</li>`).join('');});

  // --- THEME & LANGUAGE ---
  function applyTheme(){if(autoTheme?.checked)document.body.classList.toggle('dark-mode',window.matchMedia('(prefers-color-scheme: dark)').matches);}  
  if(themeToggle)themeToggle.addEventListener('click',()=>document.body.classList.toggle('dark-mode'));
  if(autoTheme)autoTheme.addEventListener('change',()=>{applyTheme();saveState();});
  if(languageSelect)languageSelect.addEventListener('change',saveState);

  // --- MENU MOBILE ---
  if(menuToggle&&sidebar)menuToggle.addEventListener('click',()=>{sidebar.style.transform=sidebar.style.transform==='translateX(-100%)'?'translateX(0)':'translateX(-100%)';});

  // --- ONBOARDING ---
  if(onboardingModal&&startOnboarding){if(!localStorage.getItem('onboarded'))onboardingModal.hidden=false;startOnboarding.addEventListener('click',()=>{onboardingModal.hidden=true;localStorage.setItem('onboarded','true');});}

  // --- RESET ---
  if(resetBtn)resetBtn.addEventListener('click',()=>{if(confirm('Azzerare tutto?')){localStorage.clear();location.reload();}});

  // --- BIND INPUT ---
  [...spinInputs,strategicContext].forEach(el=>el.addEventListener('input',()=>{saveState();const pct=updateProgress();renderChart();if(pct>=60)computeSmartMatch();}));

  // --- INIT ---
  loadState();updateProgress();renderChart();applyTheme();
});
