// ===== CONFIG =====
const API = "http://localhost:8080/api";



// Supabase client (bez kolizji nazw)
const sb = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ===== STATE =====
const AUTOSAVE_KEY = "fourlift_draft_v1";
let autosaveTimer = null;
let autosaveEnabled = true;

let progressAutoLoading = false;

let currentUserId = null;   // supabase user.id albo null (gość)
let currentEmail = null;

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-11

let myTemplates = [];
let exercises = [];

let historyVisible = false;
let lastWorkoutsCache = [];
let chartInstance = null;

let calendarVisible = false;
let weightStep = 2.5;

// ===== DEFAULT TEMPLATES =====
const DEFAULT_TEMPLATES = {
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

// ===== UI HELPERS =====
function getDraftPayload(){
  return {
    v: 1,
    savedAt: new Date().toISOString(),
    template: document.getElementById("template")?.value || "",
    notes: document.getElementById("notes")?.value || "",
    weightStep,
    exercises
  };
}

function scheduleAutosave(){
  if(!autosaveEnabled) return;
  if(autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(() => {
    try{
      const payload = getDraftPayload();
      // zapisuj tylko jeśli coś istnieje
      const hasSomething =
        payload.template.trim() ||
        payload.notes.trim() ||
        (payload.exercises && payload.exercises.length > 0);

      if(hasSomething){
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
      } else {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    } catch(e){
      console.warn("autosave failed", e);
    }
  }, 600); // debounce
}

function clearDraft(){
  localStorage.removeItem(AUTOSAVE_KEY);
}

function tryRestoreDraft(){
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if(!raw) return;

  let draft;
  try { draft = JSON.parse(raw); } catch { return; }

  const when = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : "ostatnio";
  if(!confirm(`Masz zapisany niedokończony trening (${when}). Przywrócić?`)) return;

  // przywróć state
  weightStep = Number(draft.weightStep) || weightStep;
  exercises = Array.isArray(draft.exercises) ? draft.exercises : [];
  window.exercises = exercises;

  // przywróć inputy
  const t = document.getElementById("template");
  const n = document.getElementById("notes");
  if(t) t.value = draft.template || "";
  if(n) n.value = draft.notes || "";

  render();
}


function setAuthMsg(msg) {
  const el = document.getElementById("authMsg");
  if (el) el.textContent = msg || "";
}

function setWeightStep(v){
  weightStep = Number(v);
}

function ensureSupabaseReady() {
  if (!sb) {
    setAuthMsg("Supabase się nie załadował. Sprawdź czy CDN supabase-js jest nad script.js.");
    return false;
  }
  return true;
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("auth-login").style.display = isLogin ? "block" : "none";
  document.getElementById("auth-register").style.display = isLogin ? "none" : "block";
  document.getElementById("tab-login").classList.toggle("active", isLogin);
  document.getElementById("tab-register").classList.toggle("active", !isLogin);
  setAuthMsg("");
}

function buildProgressExerciseSelect(workouts){
  const set = new Set();

  workouts.forEach(w => {
    (w.exercises ?? []).forEach(ex => {
      if (ex.exerciseName) set.add(ex.exerciseName);
    });
  });

  const names = Array.from(set).sort((a,b)=>a.localeCompare(b,"pl"));
  const sel = document.getElementById("progressSelect");
  if(!sel) return;

  sel.innerHTML = `<option value="">— wybierz ćwiczenie —</option>` +
    names.map(n => `<option value="${n.replace(/"/g,'&quot;')}">${n}</option>`).join("");

  // przywróć ostatni wybór
  const last = localStorage.getItem("lastProgressExercise");
  if(last && names.includes(last)){
    sel.value = last;
    // nie ładujemy tu wykresu
  }

}
function onProgressSelect(name){
  if(!name) return;
  localStorage.setItem("lastProgressExercise", name);
  loadProgress(name);
}



function showView(name) {
  const isLogin = name === "login";
  document.getElementById("view-login").style.display = isLogin ? "block" : "none";
  document.getElementById("view-app").style.display = isLogin ? "none" : "block";

  const topbar = document.getElementById("topbarAuthed");
  if (topbar) topbar.style.display = (!isLogin && currentUserId) ? "flex" : "none";

  const who = document.getElementById("whoami");
  if (who) who.textContent = currentEmail ? currentEmail : "";

  const guestHint = document.getElementById("guestHint");
  if (guestHint) guestHint.style.display = (!currentUserId && !isLogin) ? "block" : "none";
}

// blokada history/progress dla gościa (Twoja logika zostaje)
function showSection(sec) {
  if (!currentUserId && (sec === "history" || sec === "progress")) {
    alert("Zaloguj się, żeby mieć historię i progres 🙂");
    return;
  }

  ["new", "history", "progress"].forEach(s => {
    document.getElementById(`section-${s}`).style.display = (s === sec) ? "block" : "none";
    document.getElementById(`nav-${s}`).classList.toggle("active", s === sec);
  });

  if (sec === "progress" && !progressAutoLoading) {
    progressAutoLoading = true;

    const sel = document.getElementById("progressSelect");
    const picked = sel?.value?.trim();
    const last = (localStorage.getItem("lastProgressExercise") || "").trim();
    const toLoad = picked || last;

    if (toLoad) loadProgress(toLoad);

    progressAutoLoading = false;
  }
}

const MONTHS_PL = [
  "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
  "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"
];

function updateCalendarHeader(){
  const el = document.getElementById("calendarTitle");
  if (el) el.textContent = `${MONTHS_PL[calMonth]} ${calYear}`;
}


function toggleCalendar() {
  calendarVisible = !calendarVisible;
  document.getElementById("calendarCard").style.display = calendarVisible ? "block" : "none";
}

function goToLogin(){
  resetAppState();
  showView("login");
  switchAuthTab("login");
  setAuthMsg("");
}
function prevMonth(){
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar(lastWorkoutsCache);
}

function nextMonth(){
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar(lastWorkoutsCache);
}

function jumpToLatestWorkoutMonth(){
  if (!lastWorkoutsCache || lastWorkoutsCache.length === 0) return;

  // bierzemy najnowszą datę treningu z cache
  const dates = lastWorkoutsCache
    .map(w => w.workoutDate)
    .filter(Boolean)
    .sort(); // YYYY-MM-DD sortuje się leksykograficznie poprawnie

  const latest = dates[dates.length - 1];
  const [y, m] = latest.split("-").map(Number);
  if (!y || !m) return;

  calYear = y;
  calMonth = m - 1;
}


// ===== RESET (naprawia “duchy”) =====
function resetAppState() {
  // state
  exercises = [];
  myTemplates = [];
  lastWorkoutsCache = [];

  historyVisible = false;
  calendarVisible = false;

  // UI czyścimy
  const history = document.getElementById("history");
  if (history) history.innerHTML = "";

  const cal = document.getElementById("calendar");
  if (cal) cal.innerHTML = "";

  const day = document.getElementById("dayView");
  if (day) { day.style.display = "none"; day.innerHTML = ""; }

  const calendarCard = document.getElementById("calendarCard");
  if (calendarCard) calendarCard.style.display = "none";

  // wykres
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  // inputy
  const t = document.getElementById("template");
  const n = document.getElementById("notes");
  if (t) t.value = "";
  if (n) n.value = "";

  // select wraca do default
  const sel = document.getElementById("templateSelect");
  if (sel) sel.value = "";

  // ważne dla oninput z HTML (żeby zawsze widziało aktualną tablicę)
  window.exercises = exercises;

  render();
}

// ===== AUTH =====
async function register() {
  if (!ensureSupabaseReady()) return;

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPass").value.trim();
  if (!email || !password) { setAuthMsg("Wpisz email i hasło."); return; }

  const { error } = await sb.auth.signUp({ email, password });
  if (error) { setAuthMsg(error.message); return; }

  setAuthMsg("Konto utworzone ✅ Zaloguj się.");
  switchAuthTab("login");
}

async function login() {
  if (!ensureSupabaseReady()) return;

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPass").value.trim();
  if (!email || !password) { setAuthMsg("Wpisz email i hasło."); return; }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { setAuthMsg(error.message); return; }

  currentUserId = data.user.id;
  currentEmail = data.user.email;

  resetAppState(); // czyścimy wszystko po poprzedniej sesji
  showView("app");
  showSection("new");
  setAuthMsg("");

  // wczytaj moje szablony po loginie
  await loadMyTemplates().catch(()=>{});
}

async function logout() {
  if (!ensureSupabaseReady()) return;
  await sb.auth.signOut();

  resetAppState();
  currentUserId = null;
  currentEmail = null;

  showView("login");
  switchAuthTab("login");
}

function continueAsGuest() {
  // super ważne: pełny reset + user null
  resetAppState();
  currentUserId = null;
  currentEmail = null;

  showView("app");
  showSection("new");
}

// ===== WORKOUT UI =====
function addExercise() {
  exercises.push({
    id: crypto.randomUUID(),
    name: "",
    sets: [{ weight: 0, reps: 0, drop: false }]
  });
  window.exercises = exercises;
  render();
  scheduleAutosave();

}

function addSet(exId) {
  const ex = exercises.find(e => e.id === exId);
  ex.sets.push({ weight: 0, reps: 0, drop: false });
  window.exercises = exercises;
  render();
  scheduleAutosave();

}

function clearWorkout() {
  exercises = [];
  window.exercises = exercises;
  document.getElementById("template").value = "";
  document.getElementById("notes").value = "";
  render();
  scheduleAutosave();

}

// ===== TEMPLATES =====
async function loadMyTemplates(){
  if(!currentUserId) return;

  const r = await fetch(`${API}/templates?userId=${currentUserId}`);
  if(!r.ok) return;

  myTemplates = await r.json();

  const sel = document.getElementById("templateSelect");
  if(!sel) return;

  const fixed = `
    <option value="">— Wybierz gotowy trening —</option>
    <option value="PUSH_A">PUSH A (klata/barki/tric)</option>
    <option value="PULL_A">PULL A (plecy/bic)</option>
    <option value="LEGS_A">LEGS A (nogi)</option>
    <option value="FULLBODY_A">FULL BODY A</option>
    <option value="" disabled>────────────</option>
    <option value="" disabled>Moje szablony</option>
  `;

  const mine = myTemplates.map(t => `<option value="MY:${t.id}">${t.name}</option>`).join("");
  sel.innerHTML = fixed + mine;
}

function applyTemplate(key){
  // moje z bazy
  if(key && key.startsWith("MY:")){
    const id = key.substring(3);
    const t = myTemplates.find(x => x.id === id);
    if(!t) return;

    const input = document.getElementById("template");
    if(input) input.value = t.name;

    exercises = (t.exercises ?? [])
      .sort((a,b)=>a.exerciseOrder-b.exerciseOrder)
      .map(ex => ({
        id: crypto.randomUUID(),
        name: ex.exerciseName,
        sets: (ex.sets ?? [])
          .sort((a,b)=>a.setOrder-b.setOrder)
          .map(s => ({ weight: 0, reps: s.reps ?? 0, drop: !!s.isDrop }))
      }));

    window.exercises = exercises;
    render();
    scheduleAutosave();

    return;
  }

  // default
  if(!key || !DEFAULT_TEMPLATES[key]) return;
  const tpl = DEFAULT_TEMPLATES[key];

  const input = document.getElementById("template");
  if(input) input.value = tpl.name;

  exercises = tpl.exercises.map(ex => ({
    id: crypto.randomUUID(),
    name: ex.name,
    sets: ex.sets.map(s => ({ weight: s.weight ?? 0, reps: s.reps ?? 0, drop: !!s.drop }))
  }));

  window.exercises = exercises;
  render();
}

async function saveAsTemplate(){
  if(!currentUserId){
    alert("Zaloguj się, żeby zapisać szablon 🙂");
    return;
  }

  const name = prompt("Nazwa szablonu:", document.getElementById("template").value || "Mój trening");
  if(!name) return;

  const payload = {
    userId: currentUserId,
    name,
    exercises: exercises
      .filter(e => e.name.trim().length > 0 && e.sets.length > 0)
      .map((e, i) => ({
        name: e.name,
        order: i,
        sets: e.sets.map((s, si) => ({
          reps: Number(s.reps) || 0,
          order: si,
          isDrop: !!s.drop
        }))
      }))
  };

  if(payload.exercises.length === 0){
    alert("Szablon musi mieć chociaż 1 ćwiczenie i serię 🙂");
    return;
  }

  const r = await fetch(`${API}/templates`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });

  if(!r.ok){
    alert("Nie udało się zapisać szablonu");
    return;
  }

  alert("Zapisano szablon ✅");
  await loadMyTemplates();
}

// ===== RENDER (z inputem na kg/reps + step) =====
function render() {
  const root = document.getElementById("exercises");
  root.innerHTML = "";

  if (exercises.length > 0) {
    const stepCard = document.createElement("div");
    stepCard.className = "card";
    stepCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px">
        <div>
          <strong>Krok ciężaru</strong><br>
          <small class="muted">Szybciej dobijesz do 60/80/100, a jak trzeba to wpisz ręcznie.</small>
        </div>
        <select onchange="setWeightStep(this.value)" style="padding:10px;border-radius:10px;background:#0f0f0f;color:#eee;border:1px solid #2a2a2a">
          ${[0.5,1,2.5,5,10].map(v => `
            <option value="${v}" ${Number(weightStep)===v ? "selected" : ""}>${v} kg</option>
          `).join("")}
        </select>
      </div>
    `;
    root.appendChild(stepCard);
  }

  exercises.forEach((ex, i) => {
    const div = document.createElement("div");
    div.className = "card exercise";

div.innerHTML = `
  <div style="display:flex; gap:10px; align-items:center">
    <input style="flex:1" placeholder="Ćwiczenie"
           value="${ex.name}"
           oninput="exercises[${i}].name=this.value" />
    <button class="secondary" onclick="removeExercise(${i})">🗑</button>
  </div>


      <div style="margin-top:10px">
        ${ex.sets.map((s, si) => `
          <div class="set" style="flex-wrap:wrap">
            <button onclick="decWeight(${i},${si})">−</button>
            <input type="number" step="0.5" inputmode="decimal" style="width:110px"
                   value="${Number(s.weight) || 0}"
                   oninput="setWeight(${i},${si}, this.value)" />
            <button onclick="incWeight(${i},${si})">+</button>
            <span class="muted" style="min-width:28px">kg</span>

            <button onclick="decReps(${i},${si})">−</button>
            <input type="number" step="1" inputmode="numeric" style="width:80px"
                   value="${Number(s.reps) || 0}"
                   oninput="setReps(${i},${si}, this.value)" />
            <button onclick="incReps(${i},${si})">+</button>
            <span class="muted" style="min-width:44px">reps</span>

            <span class="badge" onclick="toggleDrop(${i},${si})">${s.drop ? "DS ✓" : "DS"}</span>
            <button class="secondary" onclick="removeSet(${i},${si})">❌</button>
          </div>
        `).join("")}
      </div>

      <button class="secondary" style="margin-top:8px" onclick="addSet('${ex.id}')">+ seria</button>
    `;

    root.appendChild(div);
  });
}

// ===== SET UX =====
function roundToStep(x, step){
  const s = Number(step) || 0.5;
  return Math.round(x / s) * s;
}

function incWeight(i, si) {
  exercises[i].sets[si].weight = roundToStep((Number(exercises[i].sets[si].weight) || 0) + weightStep, 0.5);
  render();
  scheduleAutosave();

}
function decWeight(i, si) {
  exercises[i].sets[si].weight = Math.max(0, roundToStep((Number(exercises[i].sets[si].weight) || 0) - weightStep, 0.5));
  render();
  scheduleAutosave();

}
function setWeight(i, si, val){
  const n = Number(val);
  exercises[i].sets[si].weight = Number.isFinite(n) ? roundToStep(n, 0.5) : 0;
  render();
  scheduleAutosave();

}

function incReps(i, si) { exercises[i].sets[si].reps = (Number(exercises[i].sets[si].reps) || 0) + 1; render(); scheduleAutosave();  }
function decReps(i, si) { exercises[i].sets[si].reps = Math.max(0, (Number(exercises[i].sets[si].reps) || 0) - 1); render(); scheduleAutosave(); }
function setReps(i, si, val){
  const n = Number(val);
  exercises[i].sets[si].reps = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  render();
  scheduleAutosave();

}

function toggleDrop(i, si) { exercises[i].sets[si].drop = !exercises[i].sets[si].drop; render(); scheduleAutosave(); }
function removeSet(i, si) { exercises[i].sets.splice(si, 1); render(); scheduleAutosave(); }

function removeExercise(i){
  if (!confirm("Usunąć to ćwiczenie?")) return;
  exercises.splice(i, 1);
  window.exercises = exercises;
  render();
  scheduleAutosave();

}


// ===== API HELPERS =====
async function fetchWorkouts() {
  const r = await fetch(`${API}/workouts?userId=${currentUserId}`);
  if (!r.ok) throw new Error("Nie udało się pobrać historii");
  const data = await r.json();
  lastWorkoutsCache = data;
  return data;
}

function renderHistory(data) {
  const root = document.getElementById("history");
  root.innerHTML = data.map(w => `
    <div class="card" style="cursor:pointer"
         onclick="showDay('${w.workoutDate}')">
      <strong>${w.workoutDate}</strong> – ${w.templateName ?? ""}

      <button class="secondary" style="float:right; margin-left:8px"
              onclick="event.stopPropagation(); repeatWorkout('${w.workoutDate}')">↩ Powtórz</button>

      <button class="secondary" style="float:right"
              onclick="event.stopPropagation(); deleteWorkout('${w.id}')">🗑</button>
    </div>
  `).join("");
}

// ===== SAVE =====
async function saveWorkout() {
  if (!currentUserId) {
    alert("Jesteś jako gość — zaloguj się, żeby zapisać trening.");
    return;
  }

  const payload = {
    userId: currentUserId,
    date: new Date().toISOString().slice(0, 10),
    template: document.getElementById("template").value,
    notes: document.getElementById("notes").value,
    exercises: exercises
      .filter(e => e.name.trim().length > 0 && e.sets.length > 0)
      .map((e, i) => ({
        name: e.name,
        order: i,
        sets: e.sets.map((s, si) => ({
          weight: s.weight,
          reps: s.reps,
          order: si,
          isDrop: s.drop,
          parentSetId: null
        }))
      }))
  };

  if (payload.exercises.length === 0) {
    alert("Dodaj ćwiczenie i chociaż 1 serię 🙂");
    return;
  }

  const r = await fetch(`${API}/workouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    alert("Błąd zapisu");
    return;
  }

  alert("Zapisano 💪");
  clearWorkout();
  clearDraft();

}

// ===== HISTORY + CALENDAR =====
async function repeatWorkout(date){
  if(!currentUserId){
    alert("Zaloguj się, żeby powtarzać trening 🙂");
    return;
  }

  const r = await fetch(`${API}/workouts/day?userId=${currentUserId}&date=${date}`);
  if(!r.ok){
    alert("Nie udało się pobrać treningu do powtórzenia");
    return;
  }

  const day = await r.json();
  if(!Array.isArray(day) || day.length === 0){
    alert("Brak treningu w tym dniu");
    return;
  }

  // Jeśli danego dnia było kilka treningów, bierzemy ostatni (najczęściej “najpełniejszy”)
  const w = day[day.length - 1];

  // Ustaw nagłówek treningu
  const t = document.getElementById("template");
  const n = document.getElementById("notes");
  if(t) t.value = w.templateName ?? "";
  if(n) n.value = ""; // notatka nowa

  // Przenieś ćwiczenia do formatu frontu
  exercises = (w.exercises ?? [])
    .sort((a,b)=> (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0))
    .map(ex => ({
      id: crypto.randomUUID(),
      name: (ex.exerciseName ?? "").trim(),
      sets: (ex.sets ?? [])
        .sort((a,b)=> (a.setOrder ?? 0) - (b.setOrder ?? 0))
        .map(s => ({
          weight: Number(s.weight) || 0,  // ✅ KOKS: kopiujemy ciężar
          reps: Number(s.reps) || 0,
          drop: (s.drop === true) || (s.isDrop === true)
        }))
    }));

  window.exercises = exercises;
  render();

  // autosave (jeśli masz)
  if (typeof scheduleAutosave === "function") scheduleAutosave();

  showSection("new");
  window.scrollTo({ top: 0, behavior: "smooth" });
}


async function loadHistory() {
  if (!currentUserId) {
    alert("Gość nie ma historii. Zaloguj się 🙂");
    return;
  }

  try {
  const data = await fetchWorkouts();
  renderHistory(data);
  buildProgressExerciseSelect(data);
  jumpToLatestWorkoutMonth();
  renderCalendar(data);

  historyVisible = true;
  showSection("history");

  } catch (e) {
    alert("Nie udało się wczytać historii");
    console.warn(e);
  }
}

function renderCalendar(workouts) {
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

   const year = calYear;
   const month = calMonth;

   updateCalendarHeader();

  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < (firstDay + 6) % 7; i++) cal.innerHTML += "<div></div>";

  for (let d = 1; d <= days; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const has = workouts.some(w => w.workoutDate === date);

    cal.innerHTML += `
      <div style="
        padding:10px;
        border-radius:8px;
        text-align:center;
        background:${has ? "#2ecc71" : "#222"};
        cursor:${has ? "pointer" : "default"};
      " ${has ? `onclick="showDay('${date}')"` : ""}>
        ${d}
      </div>`;
  }
}
function goToProgress(name){
  name = String(name || "").trim();
  if(!name) return;

  // ustaw dropdown (żeby UI się zgadzało)
  const sel = document.getElementById("progressSelect");
  if(sel){
    sel.value = name;
  }
  localStorage.setItem("lastProgressExercise", name);

  // przełącz widok
  showSection("progress");

  // po przełączeniu (DOM już jest), ładuj wykres
  setTimeout(() => loadProgress(name), 0);
}


async function showDay(date) {
  const r = await fetch(`${API}/workouts/day?userId=${currentUserId}&date=${date}`);
  if (!r.ok) return;

  const data = await r.json();
  const root = document.getElementById("dayView");
  root.style.display = "block";
  root.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px">
      <h3 style="margin:0">${date}</h3>
      <button class="secondary" onclick="document.getElementById('dayView').style.display='none'">Zamknij</button>
    </div>
  `;


  data.forEach(w => {
    if (w.notes) root.innerHTML += `<small>📝 ${w.notes}</small><br><br>`;

    (w.exercises ?? []).forEach(ex => {
      const safeName = String(ex.exerciseName ?? "").replace(/'/g, "\\'");
      root.innerHTML += `
        <strong style="cursor:pointer; text-decoration:underline"
               onclick="goToProgress('${safeName}')"
                title="Kliknij żeby zobaczyć progres">
          ${ex.exerciseName}
        </strong><br>
      `;

      (ex.sets ?? []).forEach(s => {
        const isDrop = (s.drop === true) || (s.isDrop === true);
        root.innerHTML += `
          <div style="margin-left:12px">
            ${s.weight}kg × ${s.reps}
            ${isDrop ? "<small style='color:#2ecc71'>DS</small>" : ""}
          </div>`;
      });

      root.innerHTML += "<br>";
    });
  });
}

// ===== DELETE =====
async function deleteWorkout(id) {
  if (!confirm("Usunąć trening?")) return;

  const r = await fetch(`${API}/workouts/${id}`, { method: "DELETE" });
  if (!r.ok) {
    alert("Nie udało się usunąć");
    return;
  }

  try {
    const data = await fetchWorkouts();
    renderCalendar(data);
    if (historyVisible) renderHistory(data);
  } catch (e) {
    console.warn(e);
  }
}


// ===== PROGRESS =====
function loadProgress(name) {
  name = String(name || "").trim();
  if (!name) return;



  // dopiero teraz łap canvas
  const canvas = document.getElementById("chart");
  if (!canvas) {
    console.warn("Brak <canvas id='chart'> w DOM. Sprawdź index.html");
    alert("Brakuje wykresu (canvas #chart). Sprawdź HTML.");
    return;
  }
  const ctx = canvas.getContext("2d");

  fetch(`${API}/stats/exercise?userId=${currentUserId}&name=${encodeURIComponent(name)}`)
    .then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        alert("Brak danych do progresu dla tego ćwiczenia (jeszcze 🙂)");
        return;
      }

      const labels = data.map(d => d.date);
      const values = data.map(d => Number(d.maxWeight));

      if (chartInstance) chartInstance.destroy();

      chartInstance = new Chart(ctx, {
        type: "line",
        data: { labels, datasets: [{ label: `${name} – max kg`, data: values, borderWidth: 3, tension: 0.2 }] },
        options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
      });

      canvas.scrollIntoView({ behavior: "smooth", block: "center" });
    })
    .catch((e) => {
      console.warn("loadProgress error:", e);
      alert("Błąd pobierania progresu (sprawdź console/network).");
    });
}


// ===== INIT =====
(async function init() {
  if (!sb) {
    showView("login");
    switchAuthTab("login");
    setAuthMsg("Nie załadował się supabase-js. Sprawdź czy skrypt supabase-js jest nad script.js.");
    return;
  }

  try {
    const { data } = await sb.auth.getSession();
    const user = data?.session?.user;

    if (user) {
      currentUserId = user.id;
      currentEmail = user.email;

      resetAppState();
      showView("app");
      showSection("new");
      tryRestoreDraft();

      await loadMyTemplates().catch(()=>{});
    } else {
      resetAppState();
      showView("login");
      switchAuthTab("login");
    }
  } catch (e) {
    resetAppState();
    showView("login");
    switchAuthTab("login");
  }
})();

// ===== expose for onclick =====
window.goToLogin = goToLogin;
window.switchAuthTab = switchAuthTab;
window.login = login;
window.register = register;
window.logout = logout;
window.continueAsGuest = continueAsGuest;
window.removeExercise = removeExercise;


window.showSection = showSection;
window.toggleCalendar = toggleCalendar;
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;

window.addExercise = addExercise;
window.addSet = addSet;
window.clearWorkout = clearWorkout;
window.saveWorkout = saveWorkout;
window.onProgressSelect = onProgressSelect;


window.loadHistory = loadHistory;
window.showDay = showDay;
window.deleteWorkout = deleteWorkout;
window.loadProgress = loadProgress;

window.setWeightStep = setWeightStep;
window.setWeight = setWeight;
window.setReps = setReps;

window.applyTemplate = applyTemplate;
window.loadMyTemplates = loadMyTemplates;
window.saveAsTemplate = saveAsTemplate;

// ważne: oninput w HTML używa "exercises[...]"
window.exercises = exercises;
window.goToProgress = goToProgress;
window.repeatWorkout = repeatWorkout;

