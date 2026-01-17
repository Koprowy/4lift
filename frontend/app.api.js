// app.api.js — backend API only (global functions)

console.log("APP.API LOADED ✅");

const API = window.API || "http://localhost:8080/api";

// Motivation
window.apiLoadMotivation = async function () {
  const r = await fetch(`${API}/motivation/random`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

// Coach
window.apiCoachYoutube = async function (text, lang = "pl") {
  const url = `${API}/coach/youtube?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
  const r = await fetch(url);
  if (r.status === 204) return { status: 204 };
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return { status: 200, data };
};

// Workouts
window.apiFetchWorkouts = async function (userId) {
  const r = await fetch(`${API}/workouts?userId=${encodeURIComponent(userId)}`);
  if (!r.ok) throw new Error("Nie udało się pobrać historii");
  return r.json();
};

window.apiFetchWorkoutsDay = async function (userId, date) {
  const r = await fetch(`${API}/workouts/day?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`);
  if (!r.ok) throw new Error("Nie udało się pobrać treningu z dnia");
  return r.json();
};

window.apiSaveWorkout = async function (payload) {
  const r = await fetch(`${API}/workouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error("Błąd zapisu");
  try { return await r.json(); } catch { return {}; }
};

window.apiDeleteWorkout = async function (id) {
  const r = await fetch(`${API}/workouts/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Nie udało się usunąć");
  return true;
};

// Templates
window.apiLoadTemplates = async function (userId) {
  const r = await fetch(`${API}/templates?userId=${encodeURIComponent(userId)}`);
  if (!r.ok) throw new Error("Nie udało się pobrać szablonów");
  return r.json();
};

window.apiSaveTemplate = async function (payload) {
  const r = await fetch(`${API}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error("Nie udało się zapisać szablonu");
  try { return await r.json(); } catch { return {}; }
};

// Stats
window.apiStatsExercise = async function (userId, name) {
  const r = await fetch(`${API}/stats/exercise?userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

console.log("APP.API READY ✅", {
  apiFetchWorkouts: typeof window.apiFetchWorkouts,
  apiStatsExercise: typeof window.apiStatsExercise
});
