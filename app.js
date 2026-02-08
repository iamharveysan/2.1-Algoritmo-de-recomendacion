const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzaulCBJHaTmYLTY1fdWx7iHhXVvMCFRW5G7i1Vse0cqzm_JHZtPeTo48oeKPgDALZ_/exec";
// =====================
// 1) Datos (Cursos)
// =====================
const cursos = [
  // E-commerce / Marketing Digital (5)
  "E-commerce: Conversión y Checkout",
  "Marketing Digital: Paid Media (Meta/Google)",
  "SEO & Contenido para Crecimiento",
  "CRM y Automatización de Marketing",
  "Analítica Digital (GA4) y KPIs",

  // Ingeniería de Sonido (5)
  "Producción Musical y Arreglo",
  "Mezcla (Mixing) y Procesamiento",
  "Mastering y Loudness",
  "Sonido en Vivo y PA",
  "Postproducción de Audio para Cine",

  // Ingeniería Multimedia (5)
  "Diseño UX/UI para Productos Digitales",
  "Motion Graphics y Animación",
  "Producción Audiovisual y Edición",
  "Realidad Aumentada y Experiencias Interactivas",
  "Modelado 3D y Render para Multimedia",

  // Psicología (5)
  "Psicología del Consumidor",
  "Psicología Organizacional",
  "Intervención en Bienestar y Salud Mental",
  "Investigación en Psicología (Métodos)",
  "Psicología Social y Comportamiento",

  // Administración de Empresas (5)
  "Estrategia Empresarial",
  "Finanzas para No Financieros",
  "Gestión de Proyectos",
  "Innovación y Emprendimiento",
  "Gestión del Talento Humano",
];

// =====================
// 2) Segmentos (perfil)
// =====================
const segmentos = {
  "S1": "Semestres 1–3",
  "S2": "Semestres 4–6",
  "S3": "Semestres 7–10",
  "D":  "Interés: Datos/Analítica",
  "C":  "Interés: Creatividad/Marca/Contenido",
  "N":  "Interés: Negocio/Emprendimiento",
};

// =====================
// 3) Contextos (preguntas)
// =====================
const contextos = {
  "A": "¿Cuál curso recomiendas más para EMPLEABILIDAD?",
  "B": "¿Qué curso recomiendas que resuelve PROBLEMAS del sector real productivo?",
  "C": "¿Cuál curso es mejor como ELECTIVA para monetizar y generar dinero en corto plazo?",
};

// Elo
const RATING_INICIAL = 1000;
const K = 32;

// =====================
// 4) Estado + storage
// =====================
const STORAGE_KEY = "coursemash_state_v2";

function defaultState() {
  const buckets = {};
  for (const seg of Object.keys(segmentos)) {
    for (const ctx of Object.keys(contextos)) {
      const key = `${seg}__${ctx}`;
      buckets[key] = {};
      cursos.forEach(c => buckets[key][c] = RATING_INICIAL);
    }
  }
  return { buckets, votes: [] };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return JSON.parse(raw); }
  catch { return defaultState(); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// =====================
// 5) Utilidades Elo
// =====================
function expectedScore(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, cursoA, cursoB, winner) { // winner: "A" o "B"
  const ra = bucket[cursoA], rb = bucket[cursoB];
  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  const sa = (winner === "A") ? 1 : 0;
  const sb = (winner === "B") ? 1 : 0;

  bucket[cursoA] = ra + K * (sa - ea);
  bucket[cursoB] = rb + K * (sb - eb);
}

// duelo aleatorio sin repetir (dentro de lo posible)
function randomPair() {
  const a = cursos[Math.floor(Math.random() * cursos.length)];
  let b = a;
  while (b === a) {
    b = cursos[Math.floor(Math.random() * cursos.length)];
  }
  return [a, b];
}

function bucketKey(seg, ctx) { return `${seg}__${ctx}`; }

function topN(bucket, n = 10) {
  const arr = Object.entries(bucket).map(([curso, rating]) => ({ curso, rating }));
  arr.sort((x, y) => y.rating - x.rating);
  return arr.slice(0, n);
}

// =====================
// 6) UI Wiring
// =====================
const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");
const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");
const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");
const btnNewPair = document.getElementById("btnNewPair");
const btnShowTop = document.getElementById("btnShowTop");
const topBox = document.getElementById("topBox");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

let currentA = null;
let currentB = null;

function fillSelect(selectEl, obj) {
  selectEl.innerHTML = "";
  for (const [k, v] of Object.entries(obj)) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} — ${v}`;
    selectEl.appendChild(opt);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

// defaults
segmentSelect.value = "S1";
contextSelect.value = "A";

function refreshQuestion() {
  questionEl.textContent = contextos[contextSelect.value];
}

function newDuel() {
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  refreshQuestion();
}

function renderTop() {
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const bucket = state.buckets[bucketKey(seg, ctx)];

  const rows = topN(bucket, 10);
  topBox.innerHTML = rows.map((r, idx) => `
    <div class="toprow">
      <div><b>${idx + 1}.</b> ${r.curso}</div>
      <div>${r.rating.toFixed(1)}</div>
    </div>
  `).join("");
}

function vote(winner) { // "A" o "B"
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const key = bucketKey(seg, ctx);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  const ganador = (winner === "A") ? currentA : currentB;
  const perdedor = (winner === "A") ? currentB : currentA;
  // ✅ Enviar voto a Google Sheets (base central)
fetch(SHEETS_API_URL, {
  method: "POST",
  mode: "no-cors", // 👈 clave para GitHub Pages + Apps Script
  headers: { "Content-Type": "text/plain;charset=utf-8" }, // 👈 evita problemas de preflight
  body: JSON.stringify({
    segmento: segmentos[seg],
    contexto: contextos[ctx],
    cursoA: currentA,
    cursoB: currentB,
    ganador: ganador,
    perdedor: perdedor
  })
}).catch(err => console.error("Error enviando a Sheets:", err));


  state.votes.push({
    ts: new Date().toISOString(),
    segmento: segmentos[seg],
    contexto: contextos[ctx],
    A: currentA,
    B: currentB,
    ganador,
    perdedor
  });

  saveState();
  renderTop();
  newDuel();
}

btnA.addEventListener("click", () => vote("A"));
btnB.addEventListener("click", () => vote("B"));
btnNewPair.addEventListener("click", () => newDuel());
btnShowTop.addEventListener("click", () => renderTop());

segmentSelect.addEventListener("change", () => { renderTop(); refreshQuestion(); });
contextSelect.addEventListener("change", () => { renderTop(); refreshQuestion(); });

btnReset.addEventListener("click", () => {
  if (!confirm("Esto borrará rankings y votos guardados en este navegador. ¿Continuar?")) return;
  state = defaultState();
  saveState();
  renderTop();
  newDuel();
});

btnExport.addEventListener("click", () => {
  if (state.votes.length === 0) {
    alert("Aún no hay votos para exportar.");
    return;
  }

  const headers = ["ts", "segmento", "contexto", "A", "B", "ganador", "perdedor"];
  const lines = [headers.join(",")];

  for (const v of state.votes) {
    const row = headers.map(h => {
      const val = String(v[h] ?? "").replaceAll('"', '""');
      return `"${val}"`;
    }).join(",");
    lines.push(row);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "coursemash_votos.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

// init
newDuel();
renderTop();
refreshQuestion();

