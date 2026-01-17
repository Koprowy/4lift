// ==============================
// app.state.js — config + state + helpers + draft
// ==============================

(() => {
  // ---- CONFIG ----
  const CFG = window.APP_CONFIG || {};
  window.API = CFG.API_BASE || "http://localhost:8080/api";

  window.SUPABASE_URL = CFG.SUPABASE_URL || "";
  window.SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || "";

  // Supabase client
  window.sb =
    (window.supabase &&
      window.supabase.createClient &&
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY)
      ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
      : null;

  // ---- STATE ----
  window.AUTOSAVE_KEY = "fourlift_draft_v1";
  window.autosaveTimer = null;
  window.autosaveEnabled = true;

  window.progressAutoLoading = false;

  window.currentUserId = null;
  window.currentEmail = null;

  window.calYear = new Date().getFullYear();
  window.calMonth = new Date().getMonth(); // 0-11

  window.historyLimit = 4;
  window.HISTORY_STEP = 4;

  window.myTemplates = [];
  window.exercises = [];

  window.historyVisible = false;
  window.lastWorkoutsCache = [];
  window.chartInstance = null;

  window.calendarVisible = false;
  window.weightStep = 2.5;

  // ---- DEFAULT TEMPLATES ----
  window.DEFAULT_TEMPLATES = {
    PUSH_A: {
      name: "PUSH A",
      exercises: [
        { name: "Wyciskanie sztangi leżąc", sets: [{weight:0,reps:8,drop:false},{weight:0,reps:8,drop:false},{weight:0,reps:8,drop:false}] },
        { name: "Wyciskanie hantli skos", sets: [{weight:0,reps:10,drop:false},{weight:0,reps:10,drop:false}] },
        { name: "OHP / Wyciskanie nad głowę", sets: [{weight:0,reps:8,drop:false},{weight:0,reps:8,drop:false}] },
        { name: "Prostowanie na triceps", sets: [{weight:0,reps:12,drop:false},{weight:0,reps:12,drop:false}] }
      ]
    },
    PULL_A: {
      name: "PULL A",
      exercises: [
        { name: "Wiosłowanie sztangą", sets: [{weight:0,reps:8,drop:false},{weight:0,reps:8,drop:false},{weight:0,reps:8,drop:false}] },
        { name: "Ściąganie drążka", sets: [{weight:0,reps:10,drop:false},{weight:0,reps:10,drop:false}] },
        { name: "Face pull", sets: [{weight:0,reps:15,drop:false},{weight:0,reps:15,drop:false}] },
        { name: "Uginanie na biceps", sets: [{weight:0,reps:12,drop:false},{weight:0,reps:12,drop:false}] }
      ]
    },
    LEGS_A: {
      name: "LEGS A",
      exercises: [
        { name: "Przysiady", sets: [{weight:0,reps:6,drop:false},{weight:0,reps:6,drop:false},{weight:0,reps:6,drop:false}] },
        { name: "RDL / Martwy na prostych", sets: [{weight:0,reps:8,drop:false},{weight:0,reps:8,drop:false}] },
        { name: "Wypychanie na suwnicy", sets: [{weight:0,reps:10,drop:false},{weight:0,reps:10,drop:false}] },
        { name: "Łydki", sets: [{weight:0,reps:15,drop:false},{weight:0,reps:15,drop:false}] }
      ]
    },
    FULLBODY_A: {
      name: "FULL BODY A",
      exercises: [
        { name: "Przysiady", sets: [{weight:0,reps:5,drop:false},{weight:0,reps:5,drop:false}] },
        { name: "Wyciskanie leżąc", sets: [{weight:0,reps:8,drop:false},{weight:0,reps:8,drop:false}] },
        { name: "Wiosłowanie", sets: [{weight:0,reps:10,drop:false},{weight:0,reps:10,drop:false}] }
      ]
    }
  };

  // ---- UI / util helpers ----
  window.$ = (id) => document.getElementById(id);

  window.escapeHtml = (str) =>
    String(str ?? "")
      .replace(/&/g,"&amp;")
      .replace(/"/g,"&quot;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");

  window.escapeForSingleQuoteJs = (str) => String(str ?? "").replace(/'/g, "\\'");

  window.roundToStep = (x, step) => {
    const s = Number(step) || 0.5;
    return Math.round(x / s) * s;
  };

  // ---- draft payload ----
  window.getDraftPayload = () => ({
    v: 1,
    savedAt: new Date().toISOString(),
    template: window.$("template")?.value || "",
    notes: window.$("notes")?.value || "",
    weightStep: window.weightStep,
    exercises: window.exercises
  });

  window.scheduleAutosave = () => {
    if (!window.autosaveEnabled) return;
    if (window.autosaveTimer) clearTimeout(window.autosaveTimer);

    window.autosaveTimer = setTimeout(() => {
      try {
        const payload = window.getDraftPayload();
        const hasSomething =
          payload.template.trim() ||
          payload.notes.trim() ||
          (payload.exercises && payload.exercises.length > 0);

        if (hasSomething) {
          localStorage.setItem(window.AUTOSAVE_KEY, JSON.stringify(payload));
        } else {
          localStorage.removeItem(window.AUTOSAVE_KEY);
        }
      } catch (e) {
        console.warn("autosave failed", e);
      }
    }, 600);
  };

  window.clearDraft = () => {
    localStorage.removeItem(window.AUTOSAVE_KEY);
  };

  window.tryRestoreDraft = () => {
    const raw = localStorage.getItem(window.AUTOSAVE_KEY);
    if (!raw) return;

    let draft;
    try { draft = JSON.parse(raw); } catch { return; }

    const when = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : "ostatnio";
    if (!confirm(`Masz zapisany niedokończony trening (${when}). Przywrócić?`)) return;

    window.weightStep = Number(draft.weightStep) || window.weightStep;
    window.exercises = Array.isArray(draft.exercises) ? draft.exercises : [];
    window.window.exercises = window.exercises; // dla inline onclick/oninput

    const t = window.$("template");
    const n = window.$("notes");
    if (t) t.value = draft.template || "";
    if (n) n.value = draft.notes || "";

    if (typeof window.render === "function") window.render();
  };
})();
