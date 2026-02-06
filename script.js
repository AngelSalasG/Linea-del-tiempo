// ================== CARGA KB ==================
let KB = [];
fetch("knowledge.json")
  .then(r => r.json())
  .then(data => { KB = data; })
  .catch(err => console.error("No pude cargar knowledge.json:", err));

// ================== CHAT BÁSICO ==================
const form = document.getElementById("chatform");
const q = document.getElementById("q");
const chatlog = document.getElementById("chatlog");

function addMsg(text, who = "bot") {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  chatlog.appendChild(div);
  chatlog.scrollTop = chatlog.scrollHeight; 
}

// ================== EXTRAER AÑO ==================
function extraerAnio(texto) {
  const m = texto.match(/\b(1[0-9]{3}|20[0-9]{2}|2100)\b/);
  return m ? m[0] : null;
}

// ================== SCORING SIMPLE ==================
function score(pregunta, texto) {
  const qwords = pregunta
    .toLowerCase()
    .replace(/[^\w\sáéíóúñü]/gi, "")
    .split(/\s+/)
    .filter(w => w.length > 2);

  const t = (texto || "").toLowerCase();
  let hits = 0;
  qwords.forEach(w => { if (t.includes(w)) hits++; });
  return hits / Math.max(qwords.length, 1);
}

function buscarContexto(pregunta) {
  if (!KB || !KB.length) return [];

  const anio = extraerAnio(pregunta);
  let base = KB;

  if (anio) base = KB.filter(x => (x.date || "").includes(anio));

  const ranked = base
    .map(x => {
      const texto = `${x.date || ""} ${x.title || ""} ${x.text || ""} ${x.extra || ""} ${(x.tags || []).join(" ")}`;
      return { ...x, s: score(pregunta, texto) };
    })
    .sort((a, b) => b.s - a.s);

  return ranked.slice(0, 1).filter(x => x.s > 0.05);
}

function responderOffline(pregunta) {
  const top = buscarContexto(pregunta);

  if (!top.length) {
    const anio = extraerAnio(pregunta);
    if (anio) return `No tengo un evento registrado para el año ${anio} en mi knowledge.`;
    return "No encuentro eso en la información de la presentación.";
  }

  const x = top[0];
  let resp = `${x.date} — ${x.title}. ${x.text}`;

  const p = pregunta.toLowerCase();
  const pideExtra = p.includes("más") || p.includes("detalles") || p.includes("extra") || p.includes("explica");
  if (pideExtra && x.extra) resp += `\nDato adicional: ${x.extra}`;

  return resp;
}

// ================== VOZ ==================
function hablar(texto) {
  if (!window.speechSynthesis) return;

  const textoCorto = (texto || "").split("\n")[0].trim();
  if (!textoCorto) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(textoCorto);
  u.lang = "es-MX";
  u.rate = 0.95;

  const voces = window.speechSynthesis.getVoices();
  const vozES = voces.find(v => (v.lang || "").toLowerCase().includes("es"));
  if (vozES) u.voice = vozES;

  window.speechSynthesis.speak(u);
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

// ================== FORM SUBMIT ==================
form?.addEventListener("submit", (e) => {
  e.preventDefault();

  const question = q.value.trim();
  if (!question) return;

  addMsg(question, "me");
  q.value = "";

  const respuesta = responderOffline(question);
  addMsg(respuesta, "bot");
  hablar(respuesta);
});

// ================== MODAL  ==================
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalExtra = document.getElementById("modalExtra");

function openModal({ title, body, extra }) {
  modalTitle.textContent = title || "Información";
  modalBody.textContent = body || "";
  modalExtra.textContent = extra || "";
  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  modal.classList.remove("is-open");
  document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".open-modal");
  if (btn) {
    openModal({
      title: btn.dataset.title,
      body: btn.dataset.body,
      extra: btn.dataset.extra
    });
  }

  if (e.target?.dataset?.close === "true") closeModal();
  if (e.target?.id === "closeModal") closeModal();
  if (e.target?.id === "okModal") closeModal();
});

// ================= REVEAL ANIMATIONS =================
const revealEls = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-li");

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => io.observe(el));


window.addEventListener("load", () => {
  const chips = document.querySelectorAll("#portada .chip.reveal-li");
  chips.forEach((chip, i) => {
    chip.style.setProperty("--d", `${i * 80}ms`);
    chip.classList.add("is-in");
  });
});
// ================== MICRÓFONO  ==================
const micBtn = document.getElementById("micBtn");


const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recog = null;
let listening = false;

const comandosRapidos = new Set(["sin problema", "claro"]);

function normalizar(txt){
  return (txt || "")
    .toLowerCase()
    .trim()
    .replace(/[¿?¡!.,;:()"]/g, "");
}

function responderComoSiLoEscribieran(pregunta){

  addMsg(pregunta, "me");
  const respuesta = responderOffline(pregunta);


 
  let prefijo = "";
  const pNorm = normalizar(pregunta);
  if (comandosRapidos.has(pNorm)) {
   
    addMsg(pNorm === "claro" ? "Claro." : "Sin problema.", "bot");
    hablar(pNorm === "claro" ? "Claro." : "Sin problema.");
    return;
  }

  if (pNorm.startsWith("claro ")) prefijo = "Claro. ";
  if (pNorm.startsWith("sin problema ")) prefijo = "Sin problema. ";


const arranques = [
  "Claro.",
  "Sin problema.",
  "Va.",
  "Perfecto.",
  "Con gusto.",
  "Por supuesto.",
  "Desde luego.",
  "Con mucho gusto.",
  "Enseguida.",
  "A la orden.",
];


const inicio = arranques[Math.floor(Math.random() * arranques.length)];


const final = `${inicio} ${respuesta}`;


addMsg(final, "bot");


hablar(`${inicio} ${respuesta}`);

}

function setListeningUI(on){
  listening = on;
  if (!micBtn) return;
  micBtn.classList.toggle("is-listening", on);
  micBtn.textContent = on ? "🛑" : "🎙️";
}

if (micBtn && SpeechRecognition) {
  recog = new SpeechRecognition();
  recog.lang = "es-MX";
  recog.continuous = false;    
  recog.interimResults = false;

  micBtn.addEventListener("click", () => {
    try {
      if (!recog) return;

      if (listening) {
        recog.stop();
        setListeningUI(false);
        return;
      }

      setListeningUI(true);
      recog.start();
    } catch (e) {
      console.error(e);
      setListeningUI(false);
      addMsg("No pude activar el micrófono en este navegador.", "bot");
    }
  });

  recog.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    setListeningUI(false);

    const texto = transcript.trim();
    if (!texto) return;

    responderComoSiLoEscribieran(texto);
  };

  recog.onerror = (event) => {
    console.warn("SpeechRecognition error:", event.error);
    setListeningUI(false);

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      addMsg("Permite el micrófono en el navegador para poder hablarme.", "bot");
      return;
    }
    addMsg("No pude escuchar bien. Intenta otra vez.", "bot");
  };

  recog.onend = () => {
    setListeningUI(false);
  };

} else if (micBtn && !SpeechRecognition) {

  micBtn.style.display = "none";
  console.warn("SpeechRecognition no soportado en este navegador.");
}
