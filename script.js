// script.js — QPWON SpinMatch (clean full rewrite, SmartMatch 2.0)
(() => {
  "use strict";

  const LS_KEYS = {
    FORM: "qpwon_spinmatch_form_autosave_v3",
    ONBOARDING_HIDE: "qpwon_spinmatch_onboarding_hide_v1",
  };

  const form           = document.getElementById("discoveryForm");
  const matchSummary   = document.getElementById("matchSummary");
  const toastContainer = document.getElementById("toastContainer");

  // Bottoni
  const newSessionBtn     = document.getElementById("newSessionBtn");
  const runRecBtn         = document.getElementById("runRecBtn");
  const surveySubmitBtn   = document.getElementById("surveySubmitBtn");
  const exportPDFBtn      = document.getElementById("exportPDF");
  const openPreventivoBtn = document.getElementById("openPreventivo");
  const helpBtn           = document.getElementById("helpBtn");

  // Pillole / badge lead
  const leadPill  = document.getElementById("leadPill");
  const leadBadge = document.getElementById("leadBadge");

  // Sidebar & sezioni
  const stepLinks     = [...document.querySelectorAll(".step-link")];
  const stepFieldsets = [...document.querySelectorAll("fieldset.step")];
  const SCROLLER      = document.querySelector(".form-section");

  // Onboarding
  const onboardingOverlay = document.getElementById("onboardingOverlay");
  const onboardingNext    = document.getElementById("onboardingNext");
  const onboardingPrev    = document.getElementById("onboardingPrev");
  const onboardingClose   = document.getElementById("onboardingClose");
  const dontShowAgain     = document.getElementById("dontShowAgain");
  const onboardingDots    = [...document.querySelectorAll(".onboarding .dot")];
  let onboardingIndex = 0;

  // Grafici
  let pieChart = null;
  let sparklineChart = null;

  const qs = (id) => document.getElementById(id);

  const debounce = (fn, delay = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  const toast = (msg = "Operazione completata", timeout = 1500) => {
    if (!toastContainer) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    }, timeout);
  };

  /* =========================
     Onboarding
  ========================== */
  const shouldShowOnboarding = () =>
    localStorage.getItem(LS_KEYS.ONBOARDING_HIDE) !== "1";

  const showOnboarding = () => {
    if (!onboardingOverlay) return;
    onboardingIndex = 0;
    updateOnboardingDots();
    onboardingOverlay.classList.remove("hidden");
    onboardingOverlay.focus?.();
  };

  const hideOnboarding = () => {
    if (!onboardingOverlay) return;
    onboardingOverlay.classList.add("hidden");
    if (dontShowAgain?.checked) localStorage.setItem(LS_KEYS.ONBOARDING_HIDE, "1");
  };

  const updateOnboardingDots = () => {
    onboardingDots.forEach((d, i) => {
      d.classList.toggle("active", i === onboardingIndex);
      d.setAttribute("aria-selected", i === onboardingIndex ? "true" : "false");
    });
  };

  /* =========================
     Autosave
  ========================== */
  const doAutosave = debounce(() => {
    if (!form?.dataset.autosave) return;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      localStorage.setItem(LS_KEYS.FORM, JSON.stringify(data));
    } catch {/* ignore */}
  }, 500);

  const restoreAutosave = () => {
    const raw = localStorage.getItem(LS_KEYS.FORM);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([k, v]) => {
        const el = form.querySelector(`[name="${CSS.escape(k)}"]`);
        if (!el) return;
        if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
          el.value = v;
        }
      });
      toast("Dati ripristinati");
      initAltroToggles(true);
    } catch {/* ignore */}
  };

  /* =========================
     Scroll-spy su scroller centrale
  ========================== */
  function getRelativeTop(el, container) {
    const elRect = el.getBoundingClientRect();
    const cRect  = container.getBoundingClientRect();
    return elRect.top - cRect.top + container.scrollTop;
  }

  function initStepNavigation() {
    if (!SCROLLER) return;

    function setActiveLink(stepId, fromClick = false) {
      stepLinks.forEach(l => {
        const isActive = l.dataset.step === stepId;
        l.classList.toggle("active", isActive);
        l.setAttribute("aria-current", isActive ? "true" : "false");
        if (isActive && !fromClick) {
          l.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      });
    }

    function scrollToStep(stepId, pushHash = true) {
      const el = document.getElementById(`step-${stepId}`);
      if (!el) return;
      const y = getRelativeTop(el, SCROLLER) - 8;
      SCROLLER.scrollTo({ top: y, behavior: "smooth" });
      setActiveLink(stepId, true);
      if (pushHash) history.replaceState(null, "", `#step-${stepId}`);
    }

    stepLinks.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        scrollToStep(btn.dataset.step);
      });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.id.split("-")[1];
          setActiveLink(id);
        }
      });
    }, {
      root: SCROLLER,
      rootMargin: "-10% 0px -70% 0px",
      threshold: 0.01
    });

    stepFieldsets.forEach(fs => observer.observe(fs));

    if (location.hash && location.hash.startsWith("#step-")) {
      const initial = location.hash.replace("#step-", "");
      setTimeout(() => scrollToStep(initial, false), 80);
    } else {
      setActiveLink("0");
    }

    window.addEventListener("hashchange", () => {
      if (location.hash.startsWith("#step-")) {
        const h = location.hash.replace("#step-", "");
        scrollToStep(h, false);
      }
    });
  }

  /* =========================
     Campi "Altro"
  ========================== */
  function toggleAltroForSelect(selectEl, silent = false) {
    const targetId = selectEl.getAttribute("data-altro-target");
    if (!targetId) return;
    const input = document.getElementById(targetId);
    const group = document.getElementById(`grp_${targetId}`);
    const isAltro = (selectEl.value || "").toLowerCase() === "altro";

    if (group) group.style.display = isAltro ? "" : "none";
    if (input) {
      input.disabled = !isAltro;
      if (!isAltro && !silent) input.value = "";
    }
  }

  function initAltroToggles(silent = false) {
    const selects = form.querySelectorAll("select[data-altro-target]");
    selects.forEach(sel => {
      toggleAltroForSelect(sel, true);
      sel.addEventListener("change", () => toggleAltroForSelect(sel, silent));
    });
  }

  /* =========================
     Profilo clinica per SmartMatch 2.0
  ========================== */
  function getClinicProfile() {
    const fd = new FormData(form);
    const strutSel = fd.get("struttura_tipo");
    const struttura_tipo = (strutSel === "altro" ? (fd.get("struttura_tipo_altro") || "").trim() : (strutSel || "")).toLowerCase();

    const gestionaleSel = fd.get("gestionale");
    const gestionale = (gestionaleSel === "altro" ? (fd.get("gestionale_altro") || "").trim() : (gestionaleSel || "")).toLowerCase();

    const canaleSel = fd.get("prenotazioni_canale");
    const canale = (canaleSel === "altro" ? (fd.get("prenotazioni_canale_altro") || "").trim() : (canaleSel || "")).toLowerCase();

    const n_medici = parseInt(fd.get("n_medici") || "0", 10) || 5;

    const areaCritSel = fd.get("area_critica");
    const areaCritica = (areaCritSel === "altro" ? (fd.get("area_critica_altro") || "").trim() : (areaCritSel || "")).toLowerCase();

    const obiettivoSel = fd.get("obiettivo_6m");
    const obiettivo = (obiettivoSel === "altro" ? (fd.get("obiettivo_6m_altro") || "").trim() : (obiettivoSel || "")).toLowerCase();

    return {
      nome: (fd.get("clinica_nome") || "").trim(),
      citta: (fd.get("clinica_citta") || "").trim(),
      struttura_tipo,
      n_medici,
      gestionale,
      canale,
      areaCritica,
      obiettivo
    };
  }

  /* =========================
     SmartMatch 2.0
  ========================== */
  function pickCaseStudies(profile) {
    const catalog = [
      { nome: "Poliambulatorio Iris", contesto: "Poliambulatorio multi-specialistico, 12 medici",
        tag: { size: "m", canale: "sito web", focus: "prenotazioni", gestionale:"gipo" },
        leva: "Agenda integrata + reminder automatici", metrica: { label: "No-show", delta: "-28%" }, incremento: 18 },
      { nome: "Centro Medico Alfa", contesto: "Centro diagnostico, 24 medici",
        tag: { size: "l", canale: "telefono", focus: "processi", gestionale:"altro" },
        leva: "Workflow reception + prenotazioni online", metrica: { label: "Tempo front-office", delta: "-35%" }, incremento: 22 },
      { nome: "Studio Salute+", contesto: "Studio privato, 4 medici",
        tag: { size: "s", canale: "miodottore", focus: "visibilità", gestionale:"nessuno" },
        leva: "CRM smart + visibilità profili", metrica: { label: "Pazienti/mese", delta: "+27%" }, incremento: 20 },
      { nome: "Clinica Borgo", contesto: "Poliambulatorio specialistico, 15 medici",
        tag: { size: "m", canale: "telefono", focus: "prenotazioni", gestionale:"gipo" },
        leva: "Online booking + conferme SMS", metrica: { label: "Prenotazioni online", delta: "+32%" }, incremento: 24 },
      { nome: "CDT Emilia", contesto: "Diagnostica per immagini, 8 medici",
        tag: { size: "m", canale: "sito web", focus: "processi", gestionale:"altro" },
        leva: "Dashboard turni + auto-assegnazione slot", metrica: { label: "Slot riempiti", delta: "+21%" }, incremento: 16 },
      { nome: "Studio Viale", contesto: "Studio privato, 6 medici",
        tag: { size: "s", canale: "telefono", focus: "visibilità", gestionale:"nessuno" },
        leva: "Campagne locali + pagina servizi", metrica: { label: "Lead qualificati", delta: "+19%" }, incremento: 14 }
    ];

    const size = profile.n_medici >= 20 ? "l" : (profile.n_medici >= 7 ? "m" : "s");
    const canaleKey = profile.canale.includes("telefono") ? "telefono"
                    : profile.canale.includes("miodottore") ? "miodottore"
                    : profile.canale ? "sito web" : "";
    const gestKey = profile.gestionale.includes("gipo") ? "gipo"
                    : profile.gestionale.includes("nessuno") ? "nessuno"
                    : profile.gestionale ? "altro" : "";
    const focus = profile.obiettivo.includes("process") ? "processi"
                : profile.obiettivo.includes("pazient") || profile.obiettivo.includes("visib") ? "visibilità"
                : "prenotazioni";

    function score(item) {
      let s = 0;
      if (item.tag.size === size) s += 2;
      if (item.tag.canale === canaleKey) s += 2;
      if (item.tag.gestionale === gestKey) s += 1;
      if (item.tag.focus === focus) s += 2;
      return s;
    }

    const ranked = catalog.map(x => ({ ...x, _s: score(x) })).sort((a,b) => b._s - a._s);
    const out = [];
    const usedFocus = new Set();
    for (const item of ranked) {
      if (out.length === 3) break;
      if (!usedFocus.has(item.tag.focus) || out.length >= 2) {
        out.push(item);
        usedFocus.add(item.tag.focus);
      }
    }
    return out;
  }

  function generaRaccomandazione() {
    const profile = getClinicProfile();
    const cases = pickCaseStudies(profile);

    const inc = Math.max(8, Math.min(35, Math.round(
      (cases[0]?.incremento ?? 0) * 0.45 +
      (cases[1]?.incremento ?? 0) * 0.35 +
      (cases[2]?.incremento ?? 0) * 0.20
    )));

    const usaCRM = profile.gestionale.includes("gipo") || profile.gestionale.includes("crm");
    const soluzione = usaCRM
      ? "CRM + Visibilità online + Agenda integrata"
      : "Visibilità online + Agenda integrata";

    const pazientiPrima = Math.max(100, profile.n_medici * 90);
    const pazientiDopo  = Math.round(pazientiPrima * (1 + inc / 100));

    const beneficiBase = [
      "Riduzione telefonate manuali",
      "Aumento prenotazioni online",
      "Dashboard automatica"
    ];
    const benefici = profile.obiettivo.includes("process")
      ? ["Riduzione tempi front-office", "Riduzione errori agenda", ...beneficiBase]
      : profile.obiettivo.includes("visib") || profile.obiettivo.includes("pazient")
      ? ["Più lead qualificati", "Miglior conversione", ...beneficiBase]
      : beneficiBase;

    const serieSparkline = [
      Math.round(pazientiPrima * 0.85),
      Math.round(pazientiPrima * 0.95),
      pazientiPrima,
      Math.round(pazientiDopo * 0.92),
      pazientiDopo
    ];

    return {
      soluzione,
      benefici,
      miglioramento: `+${inc}%`,
      incremento: inc,
      pazientiPrima,
      pazientiDopo,
      serieSparkline,
      cases
    };
  }

  function renderCaseStudies(cases) {
    const grid = document.getElementById("caseStudyGrid");
    if (!grid) return;
    grid.innerHTML = "";
    cases.forEach(cs => {
      const card = document.createElement("div");
      card.className = "result-item";
      card.innerHTML = `
        <div><strong>${cs.nome}</strong></div>
        <div>${cs.contesto}</div>
        <div>Leva principale: <em>${cs.leva}</em></div>
        <div>${cs.metrica.label}: <strong>${cs.metrica.delta}</strong></div>
      `;
      grid.appendChild(card);
    });
  }

  function renderCharts(out) {
    const pieCtx = document.getElementById("pieChart")?.getContext("2d");
    if (pieCtx) {
      if (pieChart) pieChart.destroy();
      pieChart = new Chart(pieCtx, {
        type: "pie",
        data: {
          labels: ["Perdite attuali", "Recuperato"],
          datasets: [{ data: [Math.max(0, 100 - out.incremento), out.incremento] }]
        },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } }
      });
    }

    const sparkCtx = document.getElementById("sparklineChart")?.getContext("2d");
    if (sparkCtx) {
      if (sparklineChart) sparklineChart.destroy();
      sparklineChart = new Chart(sparkCtx, {
        type: "line",
        data: {
          labels: ["T-2", "T-1", "Oggi", "T+1", "T+2"],
          datasets: [{ data: out.serieSparkline, fill: false, tension: 0.35, pointRadius: 0 }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: false } },
          elements: { line: { borderWidth: 2 } }
        }
      });
    }
  }

  function applyRecommendation(out) {
    qs("outputRaccomandazione").textContent = out.soluzione;
    qs("outputBenefici").innerHTML = out.benefici.map(b => `• ${b}`).join("<br>");
    qs("outputCasoStudio").textContent =
      `${out.pazientiPrima} → ${out.pazientiDopo} pazienti/mese`;
    qs("outputMiglioramento").textContent = out.miglioramento;

    renderCaseStudies(out.cases);
    renderCharts(out);

    matchSummary.querySelector(".result-card")?.classList.add("pulse");
    setTimeout(() => matchSummary.querySelector(".result-card")?.classList.remove("pulse"), 600);
  }

  /* =========================
     Survey → valutazione lead + prossimi passi
  ========================== */
  function valutaSurvey() {
    const fd = new FormData(form);
    let score = 0;
    const map = {
      consapevolezza: { alta: 2, media: 1, bassa: 0 },
      interesse:      { alta: 2, media: 1, bassa: 0 },
      budget:         { si: 2, decidere: 1, no: 0 },
      timeline:       { "1m": 2, "3m": 1, oltre: 0 },
      blocco:         { pronto: 2, direzione: 1, roi: 1, altro: 0 }
    };
    Object.entries(map).forEach(([k, m]) => { score += m[fd.get(k)] ?? 0; });

    if (score >= 8) return { level: "hot",   label: "Lead caldo 🔥",  color: "#ef4444" };
    if (score >= 4) return { level: "warm",  label: "Lead tiepido 🌤️", color: "#f59e0b" };
    return { level: "cold", label: "Lead freddo 🧊", color: "#3b82f6" };
  }

  function nextStepsFor(level) {
    if (level === "hot") {
      return [
        "Ricapitola in 2 minuti i benefici concordati (pazienti in più, tempo risparmiato, costi tagliati) e invia un preventivo **firmabile subito**.",
        "Blocca una data d’avvio. Frase utile: *“Così partiamo lunedì e non perdiamo le richieste della prossima settimana.”*",
        "Concorda i primi 3 KPI e chi prepara i materiali (loghi, indirizzi, servizi)."
      ];
    }
    if (level === "warm") {
      return [
        "Fai una **demo mirata** su 2–3 casi che li toccano da vicino (no generici).",
        "Porta una **mini-stima ROI**: 1 numero che resti in mente (es. *‘~+18% pazienti in 90 giorni’*).",
        "Coinvolgi il decisore: proponi un **pilot di 30 giorni** con obiettivo chiaro."
      ];
    }
    return [
      "Non forzare. Invia un contenuto **veramente utile** (case study gemello o guida pratica) e chiedi un feedback fra 2 settimane.",
      "Proponi un **micro-impegno**: audit di 15 minuti sull’agenda o sui no-show, senza parlare di prezzo.",
      "Resta presente: una nota LinkedIn o un’email breve con un consiglio pratico vale più di 3 follow-up standard."
    ];
  }

  function renderNextSteps(status) {
    const box = document.getElementById("nextStepsList");
    if (!box) return;
    box.innerHTML = "";
    nextStepsFor(status.level).forEach(t => {
      const p = document.createElement("p");
      p.innerHTML = `• ${t}`;
      box.appendChild(p);
    });
  }

  function applyLeadFeedback(status) {
    if (leadPill) {
      leadPill.textContent = `• ${status.label}`;
      leadPill.style.borderColor = status.color;
      leadPill.style.color = status.color;
      leadPill.setAttribute("aria-label", `Stato lead: ${status.label}`);
    }
    if (leadBadge) {
      leadBadge.textContent = status.label;
      leadBadge.style.background = status.color + "22";
      leadBadge.style.borderColor = status.color;
      leadBadge.style.color = status.color;
    }
    matchSummary.querySelector(".survey-result")?.remove();
    const div = document.createElement("div");
    div.className = "survey-result";
    div.style.borderLeftColor = status.color;
    div.textContent = `Valutazione: ${status.label}`;
    matchSummary.appendChild(div);

    renderNextSteps(status);
  }

  /* =========================
     Export PDF — completo
  ========================== */
  async function exportPDF() {
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) return toast("Errore: jsPDF non caricato");

      const tempWrapper = document.createElement("div");
      tempWrapper.style.padding = "18px";
      tempWrapper.style.background = "#ffffff";
      tempWrapper.style.color = "#111827";
      tempWrapper.style.width = "980px";
      tempWrapper.style.fontFamily = "Inter, Arial, sans-serif";

      const headerClone = document.querySelector(".header")?.cloneNode(true);
      headerClone?.querySelectorAll("button")?.forEach(b => b.remove());
      if (headerClone) tempWrapper.appendChild(headerClone);

      const summary = document.createElement("div");
      summary.style.margin = "12px 0 8px";
      summary.innerHTML = `<h2 style="margin:6px 0 8px 0;font-size:18px">Riepilogo discovery</h2>`;
      const fd = new FormData(form);

      function getVal(name, altName) {
        const sel = (fd.get(name) || "").toString();
        const alt = (fd.get(altName) || "").toString();
        return sel === "altro" ? alt : sel;
      }

      const rows = [
        ["Nome clinica", fd.get("clinica_nome")],
        ["Città", fd.get("clinica_citta")],
        ["Indirizzo", fd.get("clinica_indirizzo")],
        ["Telefono", fd.get("clinica_tel")],
        ["Referente", fd.get("referente_nome")],
        ["Ruolo", fd.get("referente_ruolo")],
        ["Mail", fd.get("referente_mail")],

        ["Tipo struttura", getVal("struttura_tipo","struttura_tipo_altro")],
        ["N. medici", fd.get("n_medici")],
        ["Gestionale", getVal("gestionale","gestionale_altro")],
        ["Canale prenotazioni", getVal("prenotazioni_canale","prenotazioni_canale_altro")],

        ["Tempo compiti (h/g)", fd.get("tempo_compiti")],
        ["Perdite stimate (€/mese)", fd.get("perdite_stimate")],
        ["Area critica", getVal("area_critica","area_critica_altro")],

        ["Obiettivo 6 mesi", getVal("obiettivo_6m","obiettivo_6m_altro")],
        ["Miglioramento più utile", getVal("miglioramento_top","miglioramento_top_altro")],

        ["Problema principale", getVal("problema_principale","problema_principale_altro")],
        ["Implicazioni", getVal("implicazioni","implicazioni_altro")],
        ["Situazione ideale", getVal("situazione_ideale","situazione_ideale_altro")],

        ["Note iniziali", fd.get("note_iniziali")]
      ].filter(row => row[1]);

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = "12px";

      rows.forEach(([k, v]) => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        const td = document.createElement("td");
        th.textContent = k;
        td.textContent = v;
        th.style.textAlign = "left";
        th.style.width = "35%";
        th.style.padding = "6px 8px";
        td.style.padding = "6px 8px";
        th.style.border = td.style.border = "1px solid #e5e7eb";
        tr.append(th, td);
        table.appendChild(tr);
      });
      summary.appendChild(table);
      tempWrapper.appendChild(summary);

      const resultClone = matchSummary.cloneNode(true);
      tempWrapper.appendChild(resultClone);

      document.body.appendChild(tempWrapper);
      const canvas = await html2canvas(tempWrapper, { scale: 2, backgroundColor: "#ffffff" });
      document.body.removeChild(tempWrapper);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW  = pageW - 40;
      const imgH  = (canvas.height * imgW) / canvas.width;

      if (imgH < pageH - 40) {
        pdf.addImage(imgData, "PNG", 20, 20, imgW, imgH, "", "FAST");
      } else {
        let sY = 0;
        const chunkH = (canvas.width * (pageH - 40)) / imgW;
        while (sY < canvas.height) {
          const pageCanvas = document.createElement("canvas");
          const ctx = pageCanvas.getContext("2d");
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(chunkH, canvas.height - sY);
          ctx.drawImage(canvas, 0, sY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
          const chunkData = pageCanvas.toDataURL("image/png");
          pdf.addImage(chunkData, "PNG", 20, 20, imgW, (pageCanvas.height * imgW) / canvas.width, "", "FAST");
          sY += pageCanvas.height;
          if (sY < canvas.height) pdf.addPage();
        }
      }

      const filename = `QPWON-SpinMatch_${(new Date()).toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);
      toast("PDF esportato");
    } catch (err) {
      console.error(err);
      toast("Impossibile esportare il PDF");
    }
  }

  /* =========================
     Reset sessione
  ========================== */
  function resetSessione() {
    try {
      form?.reset();
      localStorage.removeItem(LS_KEYS.FORM);
    } catch {/* ignore */}
    ["outputRaccomandazione","outputBenefici","outputCasoStudio","outputMiglioramento"]
      .forEach(id => { const el = qs(id); if (el) el.textContent = ""; });

    document.getElementById("caseStudyGrid")?.replaceChildren();

    if (pieChart) { pieChart.destroy(); pieChart = null; }
    if (sparklineChart) { sparklineChart.destroy(); sparklineChart = null; }

    if (leadPill)  { leadPill.textContent = "• Nessuna valutazione"; leadPill.removeAttribute("style"); }
    if (leadBadge) { leadBadge.textContent = "Nessuna valutazione";   leadBadge.removeAttribute("style"); }

    matchSummary.querySelector(".survey-result")?.remove();
    document.getElementById("nextStepsList")?.replaceChildren();

    if (SCROLLER) SCROLLER.scrollTo({ top: 0, behavior: "smooth" });
    toast("Nuova sessione pronta");
  }

  /* =========================
     Event binding
  ========================== */
  function bindEvents() {
    form?.addEventListener("input",  doAutosave, { passive: true });
    form?.addEventListener("change", doAutosave, { passive: true });

    initAltroToggles();

    newSessionBtn?.addEventListener("click", resetSessione);

    runRecBtn?.addEventListener("click", () => {
      const out = generaRaccomandazione();
      applyRecommendation(out);
      toast("Raccomandazione aggiornata");
    });

    surveySubmitBtn?.addEventListener("click", () => {
      const status = valutaSurvey();
      applyLeadFeedback(status);
      toast("Valutazione lead aggiornata");
    });

    exportPDFBtn?.addEventListener("click", exportPDF);

    openPreventivoBtn?.addEventListener("click", () => {
      toast("Apro il preventivo…");
    });

    helpBtn?.addEventListener("click", showOnboarding);
    onboardingClose?.addEventListener("click", hideOnboarding);
    onboardingNext?.addEventListener("click", () => {
      onboardingIndex = Math.min(4, onboardingIndex + 1);
      updateOnboardingDots();
    });
    onboardingPrev?.addEventListener("click", () => {
      onboardingIndex = Math.max(0, onboardingIndex - 1);
      updateOnboardingDots();
    });
    onboardingDots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        onboardingIndex = i;
        updateOnboardingDots();
      });
    });
  }

  function init() {
    restoreAutosave();
    initStepNavigation();
    bindEvents();
    if (shouldShowOnboarding()) setTimeout(showOnboarding, 300);
    stepFieldsets.forEach(fs => fs.classList.add("fade-in"));
  }

  document.addEventListener("DOMContentLoaded", init);
})();