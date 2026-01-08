// ===== CONFIG =====
const API = "http://localhost:8080/api";


// Supabase client (bez kolizji nazw)
const sb = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ===== STATE =====
let currentUserId = null;   // supabase user.id albo null (gość)
let currentEmail = null;

let exercises = [];
let historyVisible = false;
let lastWorkoutsCache = [];
let chartInstance = null;
let calendarVisible = false;

// ===== UI HELPERS =====
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
  currentUserId = null;
  currentEmail = null;
  showView("app");
  showSection("new");
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

  showView("app");
  showSection("new");
  setAuthMsg("");
}

async function logout() {
  if (!ensureSupabaseReady()) return;
  await sb.auth.signOut();
  currentUserId = null;
  currentEmail = null;
  showView("login");
  switchAuthTab("login");
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

function render() {
  const root = document.getElementById("exercises");
  root.innerHTML = "";

  exercises.forEach((ex, i) => {
    const div = document.createElement("div");
    div.className = "card exercise";

    div.innerHTML = `
      <input placeholder="Ćwiczenie"
             value="${ex.name}"
             oninput="exercises[${i}].name=this.value" />

      <div style="margin-top:10px">
        ${ex.sets.map((s, si) => `
          <div class="set">
            <button onclick="decWeight(${i},${si})">−</button>
            <span>${s.weight} kg</span>
            <button onclick="incWeight(${i},${si})">+</button>

            <button onclick="decReps(${i},${si})">−</button>
            <span>${s.reps} reps</span>
            <button onclick="incReps(${i},${si})">+</button>

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
function incWeight(i, si) { exercises[i].sets[si].weight += 2.5; render(); }
function decWeight(i, si) { exercises[i].sets[si].weight = Math.max(0, exercises[i].sets[si].weight - 2.5); render(); }

function incReps(i, si) { exercises[i].sets[si].reps++; render(); }
function decReps(i, si) { exercises[i].sets[si].reps = Math.max(0, exercises[i].sets[si].reps - 1); render(); }

function toggleDrop(i, si) { exercises[i].sets[si].drop = !exercises[i].sets[si].drop; render(); }

function removeSet(i, si) { exercises[i].sets.splice(si, 1); render(); }

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
    <div class="card">
      <strong>${w.workoutDate}</strong> – ${w.templateName ?? ""}
      <button class="secondary" style="float:right" onclick="deleteWorkout('${w.id}')">🗑</button>
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

// also expose state array used by inline oninput
window.exercises = exercises;
