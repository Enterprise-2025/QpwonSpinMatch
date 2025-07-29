// script.js – Logica completa QPWONSpinMatch con wizard, flag e admin
// Dipendenze via CDN: Chart.js, SheetJS (XLSX), jsPDF

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM ELEMENTS ---
  const onboardingModal = document.getElementById('onboardingModal');
  const onboardingSteps = Array.from(document.querySelectorAll('.onboarding-step'));
  const prevBtn = document.getElementById('prevStepBtn');
  const nextBtn = document.getElementById('nextStepBtn');
  const statusText = document.getElementById('onboardingStatus');
  const adminBtn = document.getElementById('adminRiapri');

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

  const autoTheme = document.getElementById('autoTheme');
  const themeToggle = document.getElementById('themeToggle');

  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');

  const resetBtn = document.getElementById('resetBtn');

  // --- ONBOARDING WIZARD ---
  let currentStep = 0;
  function showStep(idx) {
    onboardingSteps.forEach((s,i) => s.hidden = i !== idx);
    prevBtn.hidden = idx === 0;
    nextBtn.textContent = idx === onboardingSteps.length - 1 ? 'Fine' : 'Avanti';
  }
  function completeOnboarding() {
    onboardingModal.hidden = true;
    statusText.textContent = '✅ Onboarding completato';
    localStorage.setItem('onboarded','true');
  }
  // Initialize onboarding
  if (!localStorage.getItem('onboarded')) {
    onboardingModal.hidden = false;
    statusText.textContent = '🚧 Onboarding in corso';
    showStep(0);
  } else {
    statusText.textContent = '✅ Onboarding completato';
    onboardingModal.hidden = true;
  }
  prevBtn.addEventListener('click',() => { if(currentStep>0){currentStep--;showStep(currentStep);} });
  nextBtn.addEventListener('click',() => {
    if(currentStep<onboardingSteps.length-1){currentStep++;showStep(currentStep);} else completeOnboarding();
  });
  adminBtn.addEventListener('click',() => { localStorage.removeItem('onboarded'); location.reload(); });

  // --- STATE PERSISTENCE ---
  function saveState() {
    const state = {
      strategicContext: strategicContext?.value||'',
      spinAnswers: spinInputs.map(i=>i.value),
      autoTheme: autoTheme?.checked||false
    };
    localStorage.setItem('qpwonState',JSON.stringify(state));
  }
  function loadState() {
    const raw = localStorage.getItem('qpwonState');
    if(!raw)return;
    try{
      const data = JSON.parse(raw);
      if(data.strategicContext) strategicContext.value = data.strategicContext;
      if(Array.isArray(data.spinAnswers)) data.spinAnswers.forEach((v,i)=>{if(spinInputs[i])spinInputs[i].value=v;});
      if(typeof data.autoTheme==='boolean') autoTheme.checked = data.autoTheme;
    }catch{}
  }

  // --- PROGRESS SPIN ---
  function updateProgress() {
    const filled = spinInputs.filter(i=>i.value.trim()!=='').length;
    const pct = Math.round((filled/spinInputs.length)*100);
    progressBar.style.height = pct+'%';
    progressBar.setAttribute('aria-valuenow',pct);
    progressPercent.textContent = pct+'%';
    return pct;
  }

  // --- CHART ---
  function calculateScores() {
    const pain = spinInputs.slice(0,4).reduce((s,i)=>s+Number(i.dataset.score||0),0);
    const close = spinInputs.slice(4).reduce((s,i)=>s+Number(i.dataset.score||0),0);
    return { painPct:Math.round((pain/(4*5))*100), closePct:Math.round((close/(4*5))*100) };
  }
  let chart;
  function renderChart() {
    if(!scoreChartCanvas)return;
    const {painPct,closePct}=calculateScores();
    const colors = [getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(), getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim()];
    const data={labels:['Pain','Closing'],datasets:[{data:[painPct,closePct],backgroundColor:colors}]};
    if(chart){chart.data=data;chart.update();}else{chart=new Chart(scoreChartCanvas,{type:'doughnut',data,options:{responsive:true,maintainAspectRatio:false}});}    
  }

  // --- SMARTMATCH ---
  const profiles=[{name:'Basic',tags:{gestionale:1,crm:0,analytics:0}},{name:'Advanced',tags:{gestionale:2,crm:2,analytics:1}},{name:'Enterprise',tags:{gestionale:3,crm:3,analytics:2}}];
  function computeSmartMatch(){
    const max=profiles.reduce((m,p)=>Math.max(m,Object.values(p.tags).reduce((a,b)=>a+b,0)),0);
    const scored=profiles.map(p=>{const t=Object.values(p.tags).reduce((a,b)=>a+b,0);return{...p,total:t,match:t/max};}).sort((a,b)=>b.match-a.match);
    const top=scored[0];
    if(top.match>0.6){
      smartmatchSection.hidden=false;
      profileName.textContent=top.name;
      matchScore.textContent='Match: '+Math.round(top.match*100)+'%';
      solutionDesc.textContent='Soluzione '+top.name+' pronta.';
      benefitsList.innerHTML='<li>Vantaggio A</li><li>Vantaggio B</li>';
      actionsList.innerHTML='<li>Passo 1</li><li>Passo 2</li>';
    }else smartmatchSection.hidden=true;
  }

  // --- EXPORT EXCEL ---
  if(exportExcelBtn)exportExcelBtn.addEventListener('click',()=>{
    const wb=XLSX.utils.book_new();
    const rows=[['Campo','Valore'],['Contesto',strategicContext.value],...spinInputs.map(i=>[i.previousElementSibling.textContent,i.value])];
    const ws=XLSX.utils.aoa_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,'Report');XLSX.writeFile(wb,'Report.xlsx');
  });

  // --- EXPORT PDF ---
  function drawPdf(doc,logo){let y=20;doc.setFontSize(16);doc.text('Report',10,y);y+=10;if(logo)doc.addImage(logo,'PNG',150,10,40,20),y+=20;doc.setFontSize(12);doc.text('Contesto: '+strategicContext.value,10,y);y+=10;spinInputs.forEach(i=>{doc.text(i.previousElementSibling.textContent+': '+i.value,10,y);y+=8;});doc.save('Report.pdf');}
  if(exportPdfBtn)exportPdfBtn.addEventListener('click',()=>{const pdf=new window.jspdf.jsPDF();if(logoUpload.files[0]){const r=new FileReader();r.onload=e=>drawPdf(pdf,e.target.result);r.readAsDataURL(logoUpload.files[0]);}else drawPdf(pdf,null);});

  // --- LIVE SHARE ---
  if(shareBtn)shareBtn.addEventListener('click',()=>{shareView.hidden=!shareView.hidden;if(!shareView.hidden)shareList.innerHTML=spinInputs.filter(i=>i.value).map(i=>'<li>'+i.previousElementSibling.textContent+': '+i.value+'</li>').join('');});

  // --- THEME ---
  function applyTheme(){if(autoTheme.checked)document.body.classList.toggle('dark-mode',window.matchMedia('(prefers-color-scheme: dark)').matches);}  
  if(themeToggle)themeToggle.addEventListener('click',()=>document.body.classList.toggle('dark-mode'));
  if(autoTheme)autoTheme.addEventListener('change',()=>{applyTheme();saveState();});

  // --- MENU MOBILE ---
  if(menuToggle&&sidebar)menuToggle.addEventListener('click',()=>{sidebar.style.transform=sidebar.style.transform==='translateX(-100%)'?'translateX(0)':'translateX(-100%)';});

  // --- RESET ---
  if(resetBtn)resetBtn.addEventListener('click',()=>{if(confirm('Azzerare tutto?')){localStorage.clear();location.reload();}});

  // --- BIND INPUT ---
  [...spinInputs,strategicContext].forEach(el=>el.addEventListener('input',()=>{saveState();const p=updateProgress();renderChart();if(p>=60)computeSmartMatch();}));

  // --- INIT ---
  loadState();updateProgress();renderChart();computeSmartMatch();applyTheme();
});
