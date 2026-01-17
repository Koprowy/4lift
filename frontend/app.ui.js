// ==============================
// app.ui.js — UI + render + auth + init + window exports
// ==============================

(() => {
  // ---- UI basics ----
  window.setAuthMsg = (msg) => {
    const el = window.$("authMsg");
    if (el) el.textContent = msg || "";
  };

  window.ensureSupabaseReady = () => {
    if (!window.sb) {
      window.setAuthMsg("Supabase się nie załadował. Sprawdź czy CDN supabase-js i config.js są nad plikami app.*.js");
      return false;
    }
    return true;
  };

  window.toggleNotes = () => {
    const el = window.$("notes");
    if (!el) return;
    el.style.display = (el.style.display === "none" || !el.style.display) ? "block" : "none";
  };

  window.switchAuthTab = (tab) => {
    const isLogin = tab === "login";
    window.$("auth-login").style.display = isLogin ? "block" : "none";
    window.$("auth-register").style.display = isLogin ? "none" : "block";
    window.$("tab-login").classList.toggle("active", isLogin);
    window.$("tab-register").classList.toggle("active", !isLogin);
    window.setAuthMsg("");
  };

  window.showView = (name) => {
    const isLogin = name === "login";
    window.$("view-login").style.display = isLogin ? "block" : "none";
    window.$("view-app").style.display = isLogin ? "none" : "block";

    const topbar = window.$("topbarAuthed");
    if (topbar) topbar.style.display = (!isLogin && window.currentUserId) ? "flex" : "none";

    const who = window.$("whoami");
    if (who) who.textContent = window.currentEmail ? window.currentEmail : "";

    const guestHint = window.$("guestHint");
    if (guestHint) guestHint.style.display = (!window.currentUserId && !isLogin) ? "block" : "none";
  };

  window.showSection = (sec) => {
    if (!window.currentUserId && (sec === "history" || sec === "progress")) {
      alert("Zaloguj się, żeby mieć historię i progres 🙂");
      return;
    }

    ["new", "history", "progress"].forEach(s => {
      window.$(`section-${s}`).style.display = (s === sec) ? "block" : "none";
      window.$(`nav-${s}`).classList.toggle("active", s === sec);
    });

    if (sec === "progress" && !window.progressAutoLoading) {
      window.progressAutoLoading = true;

      const sel = window.$("progressSelect");
      const picked = sel?.value?.trim();
      const last = (localStorage.getItem("lastProgressExercise") || "").trim();
      const toLoad = picked || last;

      if (toLoad) window.loadProgress(toLoad);
      window.progressAutoLoading = false;
    }
  };

  // ---- Motivation ----
  window.loadMotivation = async () => {
    const el = window.$("motivationText");
    if (el) el.textContent = "Ładuję...";

    try {
      const arr = await window.apiLoadMotivation();
      const q = arr?.[0]?.q;
      const a = arr?.[0]?.a;
      if (!q) throw new Error("Bad response");
      if (el) el.textContent = `“${q}” — ${a || "Unknown"}`;
    } catch (e) {
      console.warn("loadMotivation error:", e);
      if (el) el.textContent = "Nie udało się pobrać cytatu 😅 Spróbuj jeszcze raz.";
    }
  };

  // ---- Coach ----
  window.openExerciseHelp = async (exName) => {
    exName = String(exName || "").trim();
    if (!exName) {
      alert("Najpierw wpisz nazwę ćwiczenia 🙂");
      return;
    }

    const fallbackUrl =
      `https://www.youtube.com/results?search_query=${encodeURIComponent(exName + " technika")}`;

    try {
      const resp = await window.apiCoachYoutube(exName, "pl");

      if (resp.status === 204) {
        if (confirm("Nie jestem pewien, o jakie ćwiczenie chodzi. Otworzyć wyszukiwanie na YouTube?")) {
          window.open(fallbackUrl, "_blank");
        }
        return;
      }

      const finalUrl = resp?.data?.url ? resp.data.url : fallbackUrl;
      window.open(finalUrl, "_blank");
    } catch (e) {
      console.warn("openExerciseHelp error:", e);
      window.open(fallbackUrl, "_blank");
    }
  };

  window.openHelpForCurrentExercise = () => {
    let exName = "";
    if (Array.isArray(window.exercises) && window.exercises.length > 0) {
      exName = String(window.exercises[0].name || "").trim();
    }
    if (!exName) {
      exName = prompt("Podaj nazwę ćwiczenia (np. klata ława / przysiady / ohp):", "");
      if (!exName) return;
    }
    window.openExerciseHelp(exName);
  };

  // ---- Templates ----
  window.loadMyTemplates = async () => {
    if (!window.currentUserId) return;
    try {
      window.myTemplates = await window.apiLoadTemplates(window.currentUserId);
    } catch {
      window.myTemplates = [];
    }

    const sel = window.$("templateSelect");
    if (!sel) return;

    const fixed = `
      <option value="">— Wybierz gotowy trening —</option>
      <option value="PUSH_A">PUSH A (klata/barki/tric)</option>
      <option value="PULL_A">PULL A (plecy/bic)</option>
      <option value="LEGS_A">LEGS A (nogi)</option>
      <option value="FULLBODY_A">FULL BODY A</option>
      <option value="" disabled>────────────</option>
      <option value="" disabled>Moje szablony</option>
    `;

    const mine = (window.myTemplates || [])
      .map(t => `<option value="MY:${t.id}">${window.escapeHtml(t.name)}</option>`)
      .join("");

    sel.innerHTML = fixed + mine;
  };

  window.applyTemplate = (key) => {
    // moje z bazy
    if (key && key.startsWith("MY:")) {
      const id = key.substring(3);
      const t = (window.myTemplates || []).find(x => x.id === id);
      if (!t) return;

      const input = window.$("template");
      if (input) input.value = t.name;

      window.exercises = (t.exercises ?? [])
        .sort((a,b)=>a.exerciseOrder-b.exerciseOrder)
        .map(ex => ({
          id: crypto.randomUUID(),
          name: ex.exerciseName,
          sets: (ex.sets ?? [])
            .sort((a,b)=>a.setOrder-b.setOrder)
            .map(s => ({ weight: 0, reps: s.reps ?? 0, drop: !!s.isDrop }))
        }));

      window.window.exercises = window.exercises;
      window.render();
      window.scheduleAutosave();
      return;
    }

    // default
    if (!key || !window.DEFAULT_TEMPLATES[key]) return;
    const tpl = window.DEFAULT_TEMPLATES[key];

    const input = window.$("template");
    if (input) input.value = tpl.name;

    window.exercises = tpl.exercises.map(ex => ({
      id: crypto.randomUUID(),
      name: ex.name,
      sets: ex.sets.map(s => ({ weight: s.weight ?? 0, reps: s.reps ?? 0, drop: !!s.drop }))
    }));

    window.window.exercises = window.exercises;
    window.render();
    window.scheduleAutosave();
  };

  window.saveAsTemplate = async () => {
    if (!window.currentUserId) {
      alert("Zaloguj się, żeby zapisać szablon 🙂");
      return;
    }

    const name = prompt("Nazwa szablonu:", window.$("template")?.value || "Mój trening");
    if (!name) return;

    const payload = {
      userId: window.currentUserId,
      name,
      exercises: window.exercises
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

    if (payload.exercises.length === 0) {
      alert("Szablon musi mieć chociaż 1 ćwiczenie i serię 🙂");
      return;
    }

    try {
      await window.apiSaveTemplate(payload);
      alert("Zapisano szablon ✅");
      await window.loadMyTemplates();
    } catch {
      alert("Nie udało się zapisać szablonu");
    }
  };

  // ---- Workout UI ----
  window.setWeightStep = (v) => { window.weightStep = Number(v); };

  window.addExercise = () => {
    window.exercises.push({
      id: crypto.randomUUID(),
      name: "",
      sets: [{ weight: 0, reps: 0, drop: false }]
    });
    window.window.exercises = window.exercises;
    window.render();
    window.scheduleAutosave();
  };

  window.addSet = (exId) => {
    const ex = window.exercises.find(e => e.id === exId);
    if (!ex) return;
    ex.sets.push({ weight: 0, reps: 0, drop: false });
    window.window.exercises = window.exercises;
    window.render();
    window.scheduleAutosave();
  };

  window.clearWorkout = () => {
    window.exercises = [];
    window.window.exercises = window.exercises;

    const t = window.$("template");
    const n = window.$("notes");
    if (t) t.value = "";
    if (n) n.value = "";

    window.render();
    window.scheduleAutosave();
  };

  window.removeExercise = (i) => {
    if (!confirm("Usunąć to ćwiczenie?")) return;
    window.exercises.splice(i, 1);
    window.window.exercises = window.exercises;
    window.render();
    window.scheduleAutosave();
  };

  window.setExerciseName = (i, val) => {
    window.exercises[i].name = val;
    window.scheduleAutosave();
  };

  window.incWeight = (i, si) => {
    const cur = Number(window.exercises[i].sets[si].weight) || 0;
    window.exercises[i].sets[si].weight = window.roundToStep(cur + window.weightStep, 0.5);
    window.render();
    window.scheduleAutosave();
  };

  window.decWeight = (i, si) => {
    const cur = Number(window.exercises[i].sets[si].weight) || 0;
    window.exercises[i].sets[si].weight = Math.max(0, window.roundToStep(cur - window.weightStep, 0.5));
    window.render();
    window.scheduleAutosave();
  };

  window.setWeight = (i, si, val) => {
    const n = Number(val);
    window.exercises[i].sets[si].weight = Number.isFinite(n) ? window.roundToStep(n, 0.5) : 0;
    window.render();
    window.scheduleAutosave();
  };

  window.incReps = (i, si) => {
    const cur = Number(window.exercises[i].sets[si].reps) || 0;
    window.exercises[i].sets[si].reps = cur + 1;
    window.render();
    window.scheduleAutosave();
  };

  window.decReps = (i, si) => {
    const cur = Number(window.exercises[i].sets[si].reps) || 0;
    window.exercises[i].sets[si].reps = Math.max(0, cur - 1);
    window.render();
    window.scheduleAutosave();
  };

  window.setReps = (i, si, val) => {
    const n = Number(val);
    window.exercises[i].sets[si].reps = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    window.render();
    window.scheduleAutosave();
  };

  window.toggleDrop = (i, si) => {
    window.exercises[i].sets[si].drop = !window.exercises[i].sets[si].drop;
    window.render();
    window.scheduleAutosave();
  };

  window.removeSet = (i, si) => {
    window.exercises[i].sets.splice(si, 1);
    window.render();
    window.scheduleAutosave();
  };

  // ---- Render ----
  window.render = () => {
    const root = window.$("exercises");
    if (!root) return;
    root.innerHTML = "";

    if (window.exercises.length > 0) {
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
              <option value="${v}" ${Number(window.weightStep)===v ? "selected" : ""}>${v} kg</option>
            `).join("")}
          </select>
        </div>
      `;
      root.appendChild(stepCard);
    }

    window.exercises.forEach((ex, i) => {
      const div = document.createElement("div");
      div.className = "card exercise";

      const safeName = window.escapeHtml(ex.name);

      div.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center">
          <input style="flex:1" placeholder="Ćwiczenie"
                 value="${safeName}"
                 oninput="setExerciseName(${i}, this.value)" />

          <button class="secondary"
                  title="Instruktaż na YouTube"
                  onclick="openExerciseHelp(exercises[${i}].name)">🎥</button>

          <button class="secondary" onclick="removeExercise(${i})">🗑</button>
        </div>

        <div style="margin-top:10px">
          ${(ex.sets ?? []).map((s, si) => `
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
  };

  // ---- History / progress select / calendar ----
  const MONTHS_PL = [
    "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
    "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"
  ];

  function updateCalendarHeader(){
    const el = window.$("calendarTitle");
    if (el) el.textContent = `${MONTHS_PL[window.calMonth]} ${window.calYear}`;
  }

  window.toggleCalendar = () => {
    window.calendarVisible = !window.calendarVisible;
    window.$("calendarCard").style.display = window.calendarVisible ? "block" : "none";
  };

  window.prevMonth = () => {
    window.calMonth--;
    if (window.calMonth < 0) { window.calMonth = 11; window.calYear--; }
    window.renderCalendar(window.lastWorkoutsCache);
  };

  window.nextMonth = () => {
    window.calMonth++;
    if (window.calMonth > 11) { window.calMonth = 0; window.calYear++; }
    window.renderCalendar(window.lastWorkoutsCache);
  };

  function jumpToLatestWorkoutMonth(){
    if (!window.lastWorkoutsCache || window.lastWorkoutsCache.length === 0) return;
    const dates = window.lastWorkoutsCache.map(w => w.workoutDate).filter(Boolean).sort();
    const latest = dates[dates.length - 1];
    const [y, m] = latest.split("-").map(Number);
    if (!y || !m) return;
    window.calYear = y;
    window.calMonth = m - 1;
  }

  window.renderCalendar = (workouts) => {
    const cal = window.$("calendar");
    if (!cal) return;
    cal.innerHTML = "";

    updateCalendarHeader();

    const year = window.calYear;
    const month = window.calMonth;

    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < (firstDay + 6) % 7; i++) cal.innerHTML += "<div></div>";

    for (let d = 1; d <= days; d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const has = (workouts || []).some(w => w.workoutDate === date);

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
  };

  window.renderHistory = (data) => {
    const root = window.$("history");
    if (!root) return;

    const total = Array.isArray(data) ? data.length : 0;
    const visible = Math.min(window.historyLimit, total);

    const items = (data || []).slice(0, visible).map(w => `
      <div class="card" style="cursor:pointer"
           onclick="showDay('${w.workoutDate}')">
        <strong>${w.workoutDate}</strong> – ${window.escapeHtml(w.templateName ?? "")}

        <button class="secondary" style="float:right; margin-left:8px"
                onclick="event.stopPropagation(); repeatWorkout('${w.workoutDate}')">↩ Powtórz</button>

        <button class="secondary" style="float:right"
                onclick="event.stopPropagation(); deleteWorkout('${w.id}')">🗑</button>
      </div>
    `).join("");

    let controls = "";
    if (total > window.HISTORY_STEP) {
      controls = `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:10px">
          <small class="muted">Pokazuję ${visible} z ${total}</small>
          <div style="display:flex; gap:10px">
            ${visible < total ? `<button class="secondary" onclick="showMoreHistory()">Pokaż więcej</button>` : ""}
            ${window.historyLimit > window.HISTORY_STEP ? `<button class="secondary" onclick="collapseHistory()">Zwiń</button>` : ""}
          </div>
        </div>
      `;
    }

    root.innerHTML = items + controls;
  };

  window.showMoreHistory = () => {
    window.historyLimit += window.HISTORY_STEP;
    window.renderHistory(window.lastWorkoutsCache);
  };

  window.collapseHistory = () => {
    window.historyLimit = window.HISTORY_STEP;
    window.renderHistory(window.lastWorkoutsCache);
  };

  window.buildProgressExerciseSelect = (workouts) => {
    const set = new Set();
    workouts.forEach(w => (w.exercises ?? []).forEach(ex => ex.exerciseName && set.add(ex.exerciseName)));

    const names = Array.from(set).sort((a,b)=>a.localeCompare(b,"pl"));
    const sel = window.$("progressSelect");
    if (!sel) return;

    sel.innerHTML =
      `<option value="">— wybierz ćwiczenie —</option>` +
      names.map(n => `<option value="${window.escapeHtml(n)}">${window.escapeHtml(n)}</option>`).join("");

    const last = localStorage.getItem("lastProgressExercise");
    if (last && names.includes(last)) sel.value = last;
  };

  window.goToProgress = (name) => {
    name = String(name || "").trim();
    if (!name) return;

    const sel = window.$("progressSelect");
    if (sel) sel.value = name;
    localStorage.setItem("lastProgressExercise", name);

    window.showSection("progress");
    setTimeout(() => window.loadProgress(name), 0);
  };

  // ---- History actions ----
  async function refreshCachesAfterDelete() {
    const data = await window.apiFetchWorkouts(window.currentUserId);
    window.lastWorkoutsCache = data;
    window.renderCalendar(data);
    if (window.historyVisible) window.renderHistory(data);
  }

  window.deleteWorkout = async (id) => {
    if (!confirm("Usunąć trening?")) return;
    try {
      await window.apiDeleteWorkout(id);
      await refreshCachesAfterDelete();
    } catch {
      alert("Nie udało się usunąć");
    }
  };

  window.showDay = async (date) => {
    try {
      const data = await window.apiFetchWorkoutsDay(window.currentUserId, date);
      const root = window.$("dayView");
      if (!root) return;

      root.style.display = "block";
      root.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px">
          <h3 style="margin:0">${date}</h3>
          <button class="secondary" onclick="document.getElementById('dayView').style.display='none'">Zamknij</button>
        </div>
      `;

      data.forEach(w => {
        if (w.notes) root.innerHTML += `<small>📝 ${window.escapeHtml(w.notes)}</small><br><br>`;

        (w.exercises ?? []).forEach(ex => {
          const safeName = window.escapeForSingleQuoteJs(ex.exerciseName ?? "");
          root.innerHTML += `
            <strong style="cursor:pointer; text-decoration:underline"
                    onclick="goToProgress('${safeName}')"
                    title="Kliknij żeby zobaczyć progres">
              ${window.escapeHtml(ex.exerciseName)}
            </strong><br>
          `;

          (ex.sets ?? []).forEach(s => {
            const isDrop = (s.drop === true) || (s.isDrop === true);
            root.innerHTML += `
              <div style="margin-left:12px">
                ${Number(s.weight) || 0}kg × ${Number(s.reps) || 0}
                ${isDrop ? "<small style='color:#2ecc71'>DS</small>" : ""}
              </div>`;
          });

          root.innerHTML += "<br>";
        });
      });
    } catch {
      // silent
    }
  };

  window.repeatWorkout = async (date) => {
    if (!window.currentUserId) {
      alert("Zaloguj się, żeby powtarzać trening 🙂");
      return;
    }

    try {
      const day = await window.apiFetchWorkoutsDay(window.currentUserId, date);
      if (!Array.isArray(day) || day.length === 0) {
        alert("Brak treningu w tym dniu");
        return;
      }

      const w = day[day.length - 1];

      const t = window.$("template");
      const n = window.$("notes");
      if (t) t.value = w.templateName ?? "";
      if (n) n.value = "";

      window.exercises = (w.exercises ?? [])
        .sort((a,b)=> (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0))
        .map(ex => ({
          id: crypto.randomUUID(),
          name: (ex.exerciseName ?? "").trim(),
          sets: (ex.sets ?? [])
            .sort((a,b)=> (a.setOrder ?? 0) - (b.setOrder ?? 0))
            .map(s => ({
              weight: Number(s.weight) || 0,
              reps: Number(s.reps) || 0,
              drop: (s.drop === true) || (s.isDrop === true)
            }))
        }));

      window.window.exercises = window.exercises;
      window.render();
      window.scheduleAutosave();

      window.showSection("new");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      alert("Nie udało się pobrać treningu do powtórzenia");
    }
  };

  window.loadHistory = async () => {
    if (!window.currentUserId) {
      alert("Gość nie ma historii. Zaloguj się 🙂");
      return;
    }

    try {
      const data = await window.apiFetchWorkouts(window.currentUserId);
      window.lastWorkoutsCache = data;
      window.historyLimit = window.HISTORY_STEP;

      window.renderHistory(data);
      window.buildProgressExerciseSelect(data);

      jumpToLatestWorkoutMonth();
      window.renderCalendar(data);

      window.historyVisible = true;
      window.showSection("history");
    } catch (e) {
      alert("Nie udało się wczytać historii");
      console.warn(e);
    }
  };

  // ---- Save workout ----
  window.saveWorkout = async () => {
    if (!window.currentUserId) {
      alert("Jesteś jako gość — zaloguj się, żeby zapisać trening.");
      return;
    }

    const payload = {
      userId: window.currentUserId,
      date: new Date().toISOString().slice(0, 10),
      template: window.$("template")?.value || "",
      notes: window.$("notes")?.value || "",
      exercises: window.exercises
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

    try {
      await window.apiSaveWorkout(payload);
      alert("Zapisano 💪");
      window.clearWorkout();
      window.clearDraft();
    } catch {
      alert("Błąd zapisu");
    }
  };

  // ---- Progress / Chart ----
  window.loadProgress = (name) => {
    name = String(name || "").trim();
    if (!name) return;

    const canvas = window.$("chart");
    if (!canvas) {
      console.warn("Brak <canvas id='chart'> w DOM. Sprawdź index.html");
      alert("Brakuje wykresu (canvas #chart). Sprawdź HTML.");
      return;
    }
    const ctx = canvas.getContext("2d");

    window.apiStatsExercise(window.currentUserId, name)
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          alert("Brak danych do progresu dla tego ćwiczenia (jeszcze 🙂)");
          return;
        }

        const labels = data.map(d => d.date);
        const values = data.map(d => Number(d.maxWeight));

        if (window.chartInstance) window.chartInstance.destroy();

        window.chartInstance = new Chart(ctx, {
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
  };

  // ---- Auth ----
  window.resetAppState = () => {
    window.exercises = [];
    window.myTemplates = [];
    window.lastWorkoutsCache = [];

    window.historyVisible = false;
    window.calendarVisible = false;

    const history = window.$("history");
    if (history) history.innerHTML = "";

    const cal = window.$("calendar");
    if (cal) cal.innerHTML = "";

    const day = window.$("dayView");
    if (day) { day.style.display = "none"; day.innerHTML = ""; }

    const calendarCard = window.$("calendarCard");
    if (calendarCard) calendarCard.style.display = "none";

    if (window.chartInstance) { window.chartInstance.destroy(); window.chartInstance = null; }

    const t = window.$("template");
    const n = window.$("notes");
    if (t) t.value = "";
    if (n) n.value = "";

    const sel = window.$("templateSelect");
    if (sel) sel.value = "";

    window.window.exercises = window.exercises;
    window.render();
  };

  window.goToLogin = () => {
    window.resetAppState();
    window.showView("login");
    window.switchAuthTab("login");
    window.setAuthMsg("");
  };

  window.register = async () => {
    if (!window.ensureSupabaseReady()) return;

    const email = window.$("authEmail").value.trim();
    const password = window.$("authPass").value.trim();
    if (!email || !password) { window.setAuthMsg("Wpisz email i hasło."); return; }

    const { error } = await window.sb.auth.signUp({ email, password });
    if (error) { window.setAuthMsg(error.message); return; }

    window.setAuthMsg("Konto utworzone ✅ Zaloguj się.");
    window.switchAuthTab("login");
  };

  window.login = async () => {
    if (!window.ensureSupabaseReady()) return;

    const email = window.$("authEmail").value.trim();
    const password = window.$("authPass").value.trim();
    if (!email || !password) { window.setAuthMsg("Wpisz email i hasło."); return; }

    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) { window.setAuthMsg(error.message); return; }

    window.currentUserId = data.user.id;
    window.currentEmail = data.user.email;

    window.resetAppState();
    window.showView("app");
    window.showSection("new");
    window.setAuthMsg("");

    await window.loadMyTemplates().catch(()=>{});
  };

  window.logout = async () => {
    if (!window.ensureSupabaseReady()) return;
    await window.sb.auth.signOut();

    window.resetAppState();
    window.currentUserId = null;
    window.currentEmail = null;

    window.showView("login");
    window.switchAuthTab("login");
  };

  window.continueAsGuest = () => {
    window.resetAppState();
    window.currentUserId = null;
    window.currentEmail = null;

    window.showView("app");
    window.showSection("new");
  };

  // ---- INIT ----
  (async function init() {
    if (!window.sb) {
      window.showView("login");
      window.switchAuthTab("login");
      window.setAuthMsg("Nie załadował się supabase-js albo brak config.js. Sprawdź kolejność skryptów.");
      return;
    }

    try {
      const { data } = await window.sb.auth.getSession();
      const user = data?.session?.user;

      if (user) {
        window.currentUserId = user.id;
        window.currentEmail = user.email;

        window.resetAppState();
        window.showView("app");
        window.showSection("new");
        window.tryRestoreDraft();

        await window.loadMyTemplates().catch(()=>{});
      } else {
        window.resetAppState();
        window.showView("login");
        window.switchAuthTab("login");
      }
    } catch (e) {
      window.resetAppState();
      window.showView("login");
      window.switchAuthTab("login");
    }
  })();

  // ---- Expose for inline HTML handlers ----
  window.window.exercises = window.exercises;
  window.openHelpModal = function () {
    const m = document.getElementById("helpModal");
    if (m) m.style.display = "flex";
  };

  window.closeHelpModal = function () {
    const m = document.getElementById("helpModal");
    if (m) m.style.display = "none";
  };

  // zamykanie kliknięciem w tło
  document.addEventListener("click", (e) => {
    const m = document.getElementById("helpModal");
    if (!m) return;
    if (m.style.display !== "flex") return;
    if (e.target === m) window.closeHelpModal();
  });

  // ESC zamyka modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.closeHelpModal();
  });

})();
