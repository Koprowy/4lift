// ===== CONFIG =====
const API = "http://localhost:8080/api";



// Supabase client (bez kolizji nazw)
const sb = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ===== STATE =====
let currentUserId = null;   // supabase user.id albo null (gość)
let currentEmail = null;
let myTemplates = [];

let exercises = [];
let historyVisible = false;
let lastWorkoutsCache = [];
let chartInstance = null;
let calendarVisible = false;
let weightStep = 2.5;
const DEFAULT_TEMPLATES = {
  PUSH_A: {
    name: "PUSH A",
    exercises: [
      { name: "Wyciskanie sztangi leżąc", sets: [{weight: 0, reps: 8, drop:false},{weight:0,reps:8,drop:false},{weight:0,reps:8,drop:false}] },
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
function setWeightStep(v){
weightStep = Number(v);
}
function setAuthMsg(msg) {
  const el = document.getElementById("authMsg");
  if (el) el.textContent = msg || "";
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("auth-login").style.display = isLogin ? "block" : "none";
  document.getElementById("auth-register").style.display = isLogin ? "none" : "block";
  document.getElementById("tab-login").classList.toggle("active", isLogin);
  document.getElementById("tab-register").classList.toggle("active", !isLogin);
  setAuthMsg("");
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

function showSection(sec) {
  if (!currentUserId && (sec === "history" || sec === "progress")) {
    alert("Zaloguj się, żeby mieć historię i progres 🙂");
    return;
  }

  ["new", "history", "progress"].forEach(s => {
    document.getElementById(`section-${s}`).style.display = (s === sec) ? "block" : "none";
    document.getElementById(`nav-${s}`).classList.toggle("active", s === sec);
  });
}


function toggleCalendar() {
  calendarVisible = !calendarVisible;
  document.getElementById("calendarCard").style.display = calendarVisible ? "block" : "none";
}

function continueAsGuest() {
  // ważne: reset UI po poprzednim userze
  resetAppState();

  currentUserId = null;
  currentEmail = null;

  showView("app");
  showSection("new");
  updateNavForAuth();
}

function ensureSupabaseReady() {
  if (!sb) {
    setAuthMsg("Supabase się nie załadował. Sprawdź internet i czy CDN supabase-js jest w index.html.");
    return false;
  }
  return true;
}

// ===== AUTH =====
async function register() {
  if (!ensureSupabaseReady()) return;

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPass").value.trim();
  if (!email || !password) { setAuthMsg("Wpisz email i hasło."); return; }

  const { error } = await sb.auth.signUp({ email, password });
  if (error) { setAuthMsg(error.message); return; }

  setAuthMsg("Konto utworzone ✅ Jeśli masz włączoną weryfikację maila — potwierdź i zaloguj się.");
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

  resetAppState();
  updateNavForAuth();


  showView("app");
  showSection("new");
  setAuthMsg("");
}

async function logout() {
  if (!ensureSupabaseReady()) return;

  await sb.auth.signOut();

  // reset wszystko co było z usera
  resetAppState();

  currentUserId = null;
  currentEmail = null;

  showView("login");
  switchAuthTab("login");
  updateNavForAuth();
}

function goToLogin(){
  showView("login");
  switchAuthTab("login");
  setAuthMsg("");
}

// ===== WORKOUT UI =====
function addExercise() {
  exercises.push({
    id: crypto.randomUUID(),
    name: "",
    sets: [{ weight: 0, reps: 0, drop: false }]
  });
  render();
}

function addSet(exId) {
  const ex = exercises.find(e => e.id === exId);
  ex.sets.push({ weight: 0, reps: 0, drop: false });
  render();
}

function clearWorkout() {
  exercises = [];
  document.getElementById("template").value = "";
  document.getElementById("notes").value = "";
  render();
}
function applyTemplate(key){
  if(!key || !DEFAULT_TEMPLATES[key]) return;

  const tpl = DEFAULT_TEMPLATES[key];

  // ustaw nazwę treningu / typ
  const input = document.getElementById("template");
  if(input) input.value = tpl.name;

  // wczytaj ćwiczenia
  exercises = tpl.exercises.map(ex => ({
    id: crypto.randomUUID(),
    name: ex.name,
    sets: ex.sets.map(s => ({ weight: s.weight ?? 0, reps: s.reps ?? 0, drop: !!s.drop }))
  }));

  render();
}
async function loadMyTemplates(){
  if(!currentUserId){
    alert("Zaloguj się, żeby mieć swoje szablony 🙂");
    return;
  }

  const r = await fetch(`${API}/templates?userId=${currentUserId}`);
  if(!r.ok){ alert("Nie udało się pobrać szablonów"); return; }

  myTemplates = await r.json();

  // podmień options w select
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

    render();
    return;
  }

  // stare defaulty
  if(!key || !DEFAULT_TEMPLATES[key]) return;
  const tpl = DEFAULT_TEMPLATES[key];

  const input = document.getElementById("template");
  if(input) input.value = tpl.name;

  exercises = tpl.exercises.map(ex => ({
    id: crypto.randomUUID(),
    name: ex.name,
    sets: ex.sets.map(s => ({ weight: s.weight ?? 0, reps: s.reps ?? 0, drop: !!s.drop }))
  }));

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


function resetAppState() {
  // formularz
  exercises = [];
  historyVisible = false;
  calendarVisible = false;
  lastWorkoutsCache = [];

  // UI: czyść widoki
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

  // wyczyść inputy
  const t = document.getElementById("template");
  const n = document.getElementById("notes");
  if (t) t.value = "";
  if (n) n.value = "";

  render();
}
function render() {
   const root = document.getElementById("exercises");
   root.innerHTML = "";

   // mały panel kroku (pokazuje się jak są ćwiczenia)
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
       <input placeholder="Ćwiczenie"
              value="${ex.name}"
              oninput="exercises[${i}].name=this.value" />

       <div style="margin-top:10px">
         ${ex.sets.map((s, si) => `
           <div class="set" style="flex-wrap:wrap">

             <!-- KG -->
             <button onclick="decWeight(${i},${si})">−</button>
             <input type="number"
                    step="0.5"
                    inputmode="decimal"
                    style="width:110px"
                    value="${Number(s.weight) || 0}"
                    oninput="setWeight(${i},${si}, this.value)" />
             <button onclick="incWeight(${i},${si})">+</button>
             <span class="muted" style="min-width:28px">kg</span>

             <!-- REPS -->
             <button onclick="decReps(${i},${si})">−</button>
             <input type="number"
                    step="1"
                    inputmode="numeric"
                    style="width:80px"
                    value="${Number(s.reps) || 0}"
                    oninput="setReps(${i},${si}, this.value)" />
             <button onclick="incReps(${i},${si})">+</button>
             <span class="muted" style="min-width:44px">reps</span>

             <!-- DS + DELETE -->
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
// ===== SET UX =====
function incWeight(i, si) {
  exercises[i].sets[si].weight = roundToStep((Number(exercises[i].sets[si].weight) || 0) + weightStep, 0.5);
  render();
}
function decWeight(i, si) {
  exercises[i].sets[si].weight = Math.max(0, roundToStep((Number(exercises[i].sets[si].weight) || 0) - weightStep, 0.5));
  render();
}

function setWeight(i, si, val){
  const n = Number(val);
  exercises[i].sets[si].weight = Number.isFinite(n) ? roundToStep(n, 0.5) : 0;
}

function incReps(i, si) { exercises[i].sets[si].reps = (Number(exercises[i].sets[si].reps) || 0) + 1; render(); }
function decReps(i, si) { exercises[i].sets[si].reps = Math.max(0, (Number(exercises[i].sets[si].reps) || 0) - 1); render(); }

function setReps(i, si, val){
  const n = Number(val);
  exercises[i].sets[si].reps = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function toggleDrop(i, si) { exercises[i].sets[si].drop = !exercises[i].sets[si].drop; render(); }
function removeSet(i, si) { exercises[i].sets.splice(si, 1); render(); }

// zaokrąglenie do np. 0.5
function roundToStep(x, step){
  const s = Number(step) || 0.5;
  return Math.round(x / s) * s;
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

  try {
    const data = await fetchWorkouts();
    renderCalendar(data);
    if (historyVisible) renderHistory(data);
  } catch (e) {
    console.warn(e);
  }
}

// ===== HISTORY + CALENDAR =====
async function loadHistory() {
  if (!currentUserId) {
    alert("Gość nie ma historii. Zaloguj się 🙂");
    return;
  }

  try {
    const data = await fetchWorkouts();
    renderHistory(data);
    renderCalendar(data);
    historyVisible = true;

    // przełącz na sekcję historii
    showSection("history");
  } catch (e) {
    alert("Nie udało się wczytać historii");
    console.warn(e);
  }
}

function renderCalendar(workouts) {
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

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

async function showDay(date) {
  const r = await fetch(`${API}/workouts/day?userId=${currentUserId}&date=${date}`);
  if (!r.ok) return;

  const data = await r.json();
  const root = document.getElementById("dayView");
  root.style.display = "block";
  root.innerHTML = `<h3>${date}</h3>`;

  data.forEach(w => {
    if (w.notes) root.innerHTML += `<small>📝 ${w.notes}</small><br><br>`;

    (w.exercises ?? []).forEach(ex => {
      const safeName = String(ex.exerciseName ?? "").replace(/'/g, "\\'");
      root.innerHTML += `
        <strong style="cursor:pointer; text-decoration:underline"
                onclick="loadProgress('${safeName}')"
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
  fetch(`${API}/stats/exercise?userId=${currentUserId}&name=${encodeURIComponent(name)}`)
    .then(r => {
      if (!r.ok) throw new Error("Nie udało się pobrać progresu");
      return r.json();
    })
    .then(data => {
      const canvas = document.getElementById("chart");
      const ctx = canvas.getContext("2d");

      const labels = data.map(d => d.date);
      const values = data.map(d => Number(d.maxWeight));

      if (chartInstance) chartInstance.destroy();

      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: `${name} – max kg`,
            data: values,
            borderWidth: 3,
            tension: 0.2
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
          scales: { y: { beginAtZero: true } }
        }
      });

      // przełącz na sekcję progresu
      showSection("progress");
      canvas.scrollIntoView({ behavior: "smooth", block: "center" });
    })
    .catch(e => {
      console.warn(e);
      alert("Brak danych do progresu albo błąd pobierania");
    });
}

// ===== INIT =====
(async function init() {
  // jeśli supabase nie działa, zostaw login i komunikat
  if (!sb) {
    showView("login");
    switchAuthTab("login");
    setAuthMsg("Nie załadował się supabase-js. Sprawdź czy masz <script ...supabase-js...> przed script.js.");
    return;
  }

  try {
    const { data } = await sb.auth.getSession();
    const user = data?.session?.user;

    if (user) {
      currentUserId = user.id;
      currentEmail = user.email;
      showView("app");
      showSection("new");
    } else {
      showView("login");
      switchAuthTab("login");
    }
  } catch (e) {
    showView("login");
    switchAuthTab("login");
    console.warn(e);
  }

})();

// ===== expose for onclick =====
window.goToLogin = goToLogin;
window.switchAuthTab = switchAuthTab;
window.login = login;
window.register = register;
window.logout = logout;
window.continueAsGuest = continueAsGuest;

window.showSection = showSection;
window.toggleCalendar = toggleCalendar;

window.addExercise = addExercise;
window.addSet = addSet;
window.clearWorkout = clearWorkout;
window.saveWorkout = saveWorkout;

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



