const API = "http://localhost:8080/api";
const USER_ID = "11111111-1111-1111-1111-111111111111";

let exercises = [];
let historyVisible = false;
let lastWorkoutsCache = [];
let chartInstance = null;

/* ===== NOWY TRENING ===== */

function addExercise() {
    exercises.push({
        id: crypto.randomUUID(),
        name: "",
        open: true,
        sets: [{ weight: 0, reps: 0, drop: false }]
    });
    render();
}

function addSet(exId) {
    const ex = exercises.find(e => e.id === exId);
    ex.sets.push({ weight: 0, reps: 0, drop: false });
    render();
}

/* ===== RENDER (UX) ===== */

function render() {
    const root = document.getElementById("exercises");
    root.innerHTML = "";

    exercises
        .filter(ex => ex.name.trim() !== "" || ex.sets.length > 0)
        .forEach((ex, i) => {
            const div = document.createElement("div");
            div.className = "card exercise";

            div.innerHTML = `
                <input
                    placeholder="Ćwiczenie"
                    value="${ex.name}"
                    oninput="exercises[${i}].name=this.value"
                    ${ex.name === "" ? "autofocus" : ""}
                />

                <div style="margin-top:10px">
                    ${ex.sets.map((s, si) => `
                        <div class="set">
                            <button onclick="decWeight(${i},${si})">−</button>
                            <span>${s.weight} kg</span>
                            <button onclick="incWeight(${i},${si})">+</button>

                            <button onclick="decReps(${i},${si})">−</button>
                            <span>${s.reps} reps</span>
                            <button onclick="incReps(${i},${si})">+</button>

                            <span class="badge" onclick="toggleDrop(${i},${si})">
                                ${s.drop ? "DS ✓" : "DS"}
                            </span>

                            <button class="secondary" onclick="removeSet(${i},${si})">❌</button>
                        </div>
                    `).join("")}
                </div>

                <button class="secondary" style="margin-top:8px" onclick="addSet('${ex.id}')">
                    + seria
                </button>
            `;

            root.appendChild(div);
        });
}

/* ===== UX SERII ===== */

function incWeight(i, si){ exercises[i].sets[si].weight += 2.5; render(); }
function decWeight(i, si){ exercises[i].sets[si].weight = Math.max(0, exercises[i].sets[si].weight - 2.5); render(); }

function incReps(i, si){ exercises[i].sets[si].reps++; render(); }
function decReps(i, si){ exercises[i].sets[si].reps = Math.max(0, exercises[i].sets[si].reps - 1); render(); }

function toggleDrop(i, si){ exercises[i].sets[si].drop = !exercises[i].sets[si].drop; render(); }

function removeSet(i, si) {
    exercises[i].sets.splice(si, 1);
    render();
}

/* ===== API HELPERS ===== */

async function fetchWorkouts() {
    const r = await fetch(`${API}/workouts?userId=${USER_ID}`);
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

/* ===== ZAPIS ===== */

async function saveWorkout() {
    const payload = {
        userId: USER_ID,
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

    // reset formularza
    exercises = [];
    document.getElementById("template").value = "";
    document.getElementById("notes").value = "";
    render();

    // odśwież widok historii/kalendarza (bez F5)
    try {
        const data = await fetchWorkouts();
        renderCalendar(data);
        if (historyVisible) renderHistory(data);
    } catch (e) {
        console.warn(e);
    }
}

/* ===== HISTORIA + KALENDARZ ===== */

async function loadHistory() {
    const root = document.getElementById("history");

    if (historyVisible) {
        root.innerHTML = "";
        document.getElementById("calendar").innerHTML = "";
        historyVisible = false;
        return;
    }

    try {
        const data = await fetchWorkouts();
        renderHistory(data);
        renderCalendar(data);
        historyVisible = true;
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
        const date = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
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

/* ===== PODGLĄD DNIA + KLIK DO PROGRESU ===== */

async function showDay(date) {
    const r = await fetch(`${API}/workouts/day?userId=${USER_ID}&date=${date}`);
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
                <strong
                    style="cursor:pointer; text-decoration:underline"
                    onclick="loadProgress('${safeName}')"
                    title="Kliknij żeby zobaczyć progres"
                >
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

/* ===== DELETE ===== */

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

/* ===== PROGRES (WYKRES) ===== */

function loadProgress(name) {
    fetch(`${API}/stats/exercise?userId=${USER_ID}&name=${encodeURIComponent(name)}`)
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

            canvas.scrollIntoView({ behavior: "smooth", block: "center" });
        })
        .catch(e => {
            console.warn(e);
            alert("Brak danych do progresu albo błąd pobierania");
        });
}
