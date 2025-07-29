// script.js – Logica completa QPWONSpinMatch riscritta da zero
// Dipendenze: Chart.js, SheetJS (XLSX), jsPDF (jspdf.jsPDF)

document.addEventListener('DOMContentLoaded', () => {
  // ----- DOM ELEMENTS -----
  const modal = document.getElementById('onboardingModal');
  const steps = Array.from(document.querySelectorAll('.onboarding-step'));
  const btnPrev = document.getElementById('prevStepBtn');
  const btnNext = document.getElementById('nextStepBtn');
  const status = document.getElementById('onboardingStatus');
  const btnAdmin = document.getElementById('adminRiapri');
  const txtContext = document.getElementById('strategicContext');
  const inputs = Array.from(document.querySelectorAll('#spin input'));
  const bar = document.getElementById('progressBar');
  const pct  = document.getElementById('progressPercent');
  const btnShare = document.getElementById('toggleShareView');
  const viewShare = document.getElementById('shareView');
  const listShare = document.getElementById('shareList');
  const secSmart = document.getElementById('smartmatch');
  const outProfile = document.getElementById('profileName');
  const outMatch   = document.getElementById('matchScore');
  const outSol     = document.getElementById('solutionDesc');
  const outBen     = document.getElementById('benefitsList');
  const outAct     = document.getElementById('actionsList');
  const canvas     = document.getElementById('scoreChart');
  const btnXLS     = document.getElementById('exportExcelBtn');
  const btnPDF     = document.getElementById('exportPdfBtn');
  const inLogo     = document.getElementById('logoUpload');
  const chkAuto    = document.getElementById('autoTheme');
  const btnTheme   = document.getElementById('themeToggle');
  const btnMenu    = document.getElementById('menuToggle');
  const sidebar    = document.getElementById('sidebar');
  const btnReset   = document.getElementById('resetBtn');

  // ----- ONBOARDING WIZARD -----
  let stepIndex = 0;
  function updateWizard() {
    steps.forEach((s,i) => s.hidden = i !== stepIndex);
    btnPrev.hidden = stepIndex === 0;
    btnNext.textContent = stepIndex === steps.length - 1 ? 'Fine' : 'Avanti';
  }
  function finishOnboarding() {
    modal.hidden = true;
    status.textContent = '✅ Onboarding completato';
    localStorage.setItem('onboarded','1');
  }
  if (!localStorage.getItem('onboarded')) {
    modal.hidden = false;
    status.textContent = '🚧 Onboarding in corso';
    updateWizard();
  } else {
    modal.hidden = true;
    status.textContent = '✅ Onboarding completato';
  }
  btnPrev.addEventListener('click', () => {
    if (stepIndex>0) { stepIndex--; updateWizard(); }
  });
  btnNext.addEventListener('click', () => {
    if (stepIndex<steps.length-1) {
      stepIndex++; updateWizard();
    } else finishOnboarding();
  });
  btnAdmin.addEventListener('click', () => {
    localStorage.removeItem('onboarded'); location.reload();
  });

  // ----- STATE MANAGEMENT -----
  function saveAll() {
    const state = {
      context: txtContext.value,
      answers: inputs.map(i=>i.value),
      dark: chkAuto.checked
    };
    localStorage.setItem('qpState', JSON.stringify(state));
  }
  function loadAll() {
    const raw = localStorage.getItem('qpState');
    if (!raw) return;
    try {
      const st = JSON.parse(raw);
      txtContext.value = st.context||'';
      inputs.forEach((i,k)=>{ i.value = st.answers?.[k]||''; });
      chkAuto.checked = !!st.dark;
    } catch{};
  }

  // ----- PROGRESS BAR -----
  function updateProgress() {
    const filled = inputs.filter(i=>i.value.trim()).length;
    const percent = Math.round(filled/inputs.length*100);
    bar.style.height = percent+'%';
    bar.setAttribute('aria-valuenow',percent);
    pct.textContent = percent+'%';
    return percent;
  }

  // ----- CHART.JS -----
  let chartObj;
  function updateChart() {
    if (!canvas) return;
    const scores = inputs.map(i=>Number(i.dataset.score||0));
    const pain = scores.slice(0,4).reduce((a,b)=>a+b,0);
    const close= scores.slice(4).reduce((a,b)=>a+b,0);
    const pPct = Math.round(pain/(4*5)*100);
    const cPct = Math.round(close/(4*5)*100);
    const clr1 = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    const clr2 = getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim();
    const data = { labels:['Pain','Closing'], datasets:[{ data:[pPct,cPct], backgroundColor:[clr1,clr2] }] };
    if (chartObj) {
      chartObj.data = data; chartObj.update();
    } else {
      chartObj = new Chart(canvas,{ type:'doughnut', data, options:{responsive:true,maintainAspectRatio:false} });
    }
  }

  // ----- SMARTMATCH -----
  const profiles = [
    {name:'Basic', weights:[1,0,0]},
    {name:'Advanced',weights:[2,2,1]},
    {name:'Enterprise',weights:[3,3,2]}
  ];
  function runSmartMatch() {
    const percent = updateProgress();
    if (percent<60) { secSmart.hidden=true; return; }
    const tagSum = profiles.map(p=>p.weights.reduce((a,b)=>a+b,0));
    const maxSum = Math.max(...tagSum);
    const scored = profiles.map((p,i)=>({ name:p.name, pct:tagSum[i]/maxSum }));
    scored.sort((a,b)=>b.pct - a.pct);
    const top = scored[0];
    if (top.pct>0.6) {
      secSmart.hidden=false;
      outProfile.textContent = top.name;
      outMatch.textContent = 'Match: '+Math.round(top.pct*100)+'%';
      outSol.textContent = `Soluzione ${top.name} disponibile.`;
      outBen.innerHTML = '<li>Benefit 1</li><li>Benefit 2</li>';
      outAct.innerHTML = '<li>Azione A</li><li>Azione B</li>';
    } else secSmart.hidden=true;
  }

  // ----- EXPORT EXCEL (SheetJS) -----
  if (btnXLS) btnXLS.addEventListener('click', ()=>{
    const wb = XLSX.utils.book_new();
    const rows = [['Campo','Valore'], ['Contesto',txtContext.value], ...inputs.map(i=>[i.previousElementSibling.textContent,i.value])];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,'Report');
    XLSX.writeFile(wb,'Report.xlsx');
  });

  // ----- EXPORT PDF (jsPDF) -----
  function makePdf(doc,logo){
    let y=20; doc.setFontSize(16); doc.text('Report QPWON',10,y); y+=10;
    if (logo) doc.addImage(logo,'PNG',150,10,40,20),y+=20;
    doc.setFontSize(12); doc.text('Contesto: '+txtContext.value,10,y); y+=10;
    inputs.forEach(i=>{ doc.text(i.previousElementSibling.textContent+': '+i.value,10,y); y+=8; });
    doc.save('Report.pdf');
  }
  if (btnPDF) btnPDF.addEventListener('click', ()=>{
    const pdf = new window.jspdf.jsPDF();
    if (inLogo.files[0]) {
      const reader = new FileReader(); reader.onload=e=>makePdf(pdf,e.target.result);
      reader.readAsDataURL(inLogo.files[0]);
    } else makePdf(pdf,null);
  });

  // ----- LIVE SHARE -----
  if (btnShare) btnShare.addEventListener('click', ()=>{
    viewShare.hidden = !viewShare.hidden;
    if (!viewShare.hidden) viewShare.innerHTML = inputs.filter(i=>i.value).map(i=>`<li>${i.previousElementSibling.textContent}: ${i.value}</li>`).join('');
  });

  // ----- THEME TOGGLE -----
  function applyTheme() {
    document.body.classList.toggle('dark-mode', chkAuto.checked
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : document.body.classList.contains('dark-mode')
    );
  }
  if (btnTheme) btnTheme.addEventListener('click', ()=> document.body.classList.toggle('dark-mode'));
  if (chkAuto) chkAuto.addEventListener('change', ()=>{ applyTheme(); saveAll(); });

  // ----- MOBILE MENU -----
  if (btnMenu && sidebar) btnMenu.addEventListener('click', ()=>{
    sidebar.style.transform = sidebar.style.transform==='translateX(-100%)'?'translateX(0)':'translateX(-100%)';
  });

  // ----- RESET TOOL -----
  if (btnReset) btnReset.addEventListener('click', ()=>{
    if (confirm('Ricominciare da capo?')) { localStorage.clear(); location.reload(); }
  });

  // ----- BIND INPUT EVENTS -----
  [...inputs, txtContext].forEach(el => el.addEventListener('input', () => {
    saveAll(); updateProgress(); updateChart(); runSmartMatch();
  }));

  // ----- INITIALIZATION -----
  loadAll(); updateProgress(); updateChart(); runSmartMatch(); applyTheme();
});
