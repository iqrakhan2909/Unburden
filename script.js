import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

// Unburden uses an open model in the browser. No hosted inference API or API key.
env.allowLocalModels = false;
env.useBrowserCache = true;

const $ = (selector) => document.querySelector(selector);
const dump = $("#brainDump");
const runButton = $("#unburdenBtn");
const buttonText = $("#buttonText");
const modelStatus = $("#modelStatus");
const statusPulse = $("#statusPulse");
const result = $("#result");
const emptyState = $("#emptyState");
const planBadge = $("#planBadge");
const wordCount = $("#wordCount");
const toast = $("#toast");

let energy = "medium";
let generator = null;
let loadingPromise = null;
let toastTimer = null;

const sample = "Reply to the professor about the assignment\nFinish DBMS notes\nBuy groceries for the week\nReply to the messages I keep ignoring\nClean my desk because I cannot find anything\nStart the project report";

dump.addEventListener("input", () => {
  const words = dump.value.trim() ? dump.value.trim().split(/\s+/).length : 0;
  wordCount.textContent = `${words} WORD${words === 1 ? "" : "S"}`;
});

document.querySelectorAll(".energy-btn").forEach((button) => {
  button.addEventListener("click", () => {
    energy = button.dataset.energy;
    document.querySelectorAll(".energy-btn").forEach((item) => item.classList.toggle("active", item === button));
  });
});

$("#sampleBtn").addEventListener("click", () => {
  dump.value = sample;
  dump.dispatchEvent(new Event("input"));
  dump.focus();
});

$("#privacyBtn").addEventListener("click", () => $("#privacyDialog").showModal());
$("#closePrivacy").addEventListener("click", () => $("#privacyDialog").close());
$("#privacyOkay").addEventListener("click", () => $("#privacyDialog").close());
$("#backToTop").addEventListener("click", () => {
  $("#workspace").scrollIntoView({ behavior: "smooth" });
  dump.focus({ preventScroll: true });
});

function setStatus(message, loading = false) {
  modelStatus.textContent = message;
  statusPulse.classList.toggle("loading", loading);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

async function loadModel() {
  if (generator) return generator;
  if (loadingPromise) return loadingPromise;
  setStatus("Loading open model into your browser… first run may take a minute", true);
  loadingPromise = pipeline("text2text-generation", "Xenova/flan-t5-small", {
    dtype: "q8",
    progress_callback: (progress) => {
      if (progress.status === "progress" && Number.isFinite(progress.progress)) {
        setStatus(`Downloading open model · ${Math.round(progress.progress)}%`, true);
      } else if (progress.status === "download") {
        setStatus("Downloading model files to this browser…", true);
      }
    }
  }).then((pipe) => {
    generator = pipe;
    setStatus("Open model ready · inference stays in this browser");
    return generator;
  }).catch((error) => {
    loadingPromise = null;
    setStatus("Model couldn't load · check internet, then try again");
    throw error;
  });
  return loadingPromise;
}

function cleanText(text) {
  return text.replace(/^\s*[-*•\d.)]+\s*/, "").replace(/\s+/g, " ").trim();
}

function fallbackPlan(raw) {
  // Safety net for network/model failures; explicitly labelled in the UI.
  const lines = raw.split(/\n|[.!?;]+/).map(cleanText).filter(Boolean);
  const tasks = lines.flatMap(line => line.split(/,\s*(?=(?:reply|finish|start|buy|clean|send|read|write|call|submit|review|prepare|study|complete|book|pay|check|organize|organise|fix|update|email|message)\b)/i))
    .map(cleanText).filter(line => line.length > 2).slice(0, 7);
  const first = tasks[0] || "Open the task you have been avoiding";
  const tiny = {
    low: `Spend just 2 minutes on: ${first.toLowerCase()}`,
    medium: `Open what you need for: ${first.toLowerCase()}`,
    high: `Start the first concrete part of: ${first.toLowerCase()}`
  };
  return {
    title: "A smaller starting line",
    intro: "The model did not load, so this is a lightweight local fallback—not an AI-generated plan. You can still use the tiny first step.",
    next: tiny[energy],
    tasks: tasks.slice(0, 5).map((task, index) => ({
      text: makeTiny(task, index, energy),
      meta: index === 0 ? "START HERE" : (energy === "low" ? "OPTIONAL · 2–5 MIN" : "WHEN READY")
    })),
    fallback: true
  };
}

function makeTiny(task, index, currentEnergy) {
  const lower = task.charAt(0).toLowerCase() + task.slice(1);
  if (currentEnergy === "low") {
    const prefixes = ["Open the file or app for", "Do only the first 2 minutes of", "Write one rough line for", "Put the needed items beside you for", "Choose the very first step for"];
    return `${prefixes[index % prefixes.length]}: ${lower}`;
  }
  const prefixes = ["Open what you need for", "Break into one small action:", "Make a rough first attempt at", "Set up the materials for", "Finish one small piece of"];
  return `${prefixes[index % prefixes.length]} ${lower}`;
}

function parseModelOutput(raw, original) {
  // Ask the model for a constrained, human-readable structure. If it ignores the
  // format, salvage the lines rather than pretending the output is structured.
  let lines = raw.split("\n").map(line => line.replace(/^[\s\-*•\d.)]+/, "").trim()).filter(Boolean);
  if (lines.length < 2) lines = raw.split(/(?<=[.!?])\s+/).map(cleanText).filter(Boolean);
  const tasks = lines.map(line => line.replace(/^(title|first step|next step|plan|task \d*|intro|reason)\s*:\s*/i, "").trim())
    .filter(line => line.length > 3 && !/^(title|first step|next step|plan|task \d*|intro|reason)$/i.test(line))
    .slice(0, 6);
  if (!tasks.length) return fallbackPlan(original);
  const first = tasks[0].replace(/^["']|["']$/g, "");
  return {
    title: "A smaller starting line",
    intro: energy === "low" ? "Low battery mode: the goal is to begin gently, not finish everything." : "A short plan with permission to stop after the first step.",
    next: first.length > 100 ? first.slice(0, 97) + "…" : first,
    tasks: tasks.slice(1).map((text, index) => ({
      text: text.replace(/^["']|["']$/g, ""),
      meta: index === 0 ? "NEXT · ONLY IF READY" : "OPTIONAL · NO RUSH"
    })),
    fallback: false
  };
}

async function generatePlan(raw) {
  const model = await loadModel();
  const energyGuide = {
    low: "The person has very low energy. Suggest extremely tiny, low-effort actions and permission to stop.",
    medium: "The person has moderate energy. Suggest practical small actions.",
    high: "The person has good energy. Suggest focused but still manageable actions."
  }[energy];
  const prompt = `You are Unburden, a gentle task-shrinking assistant. Never shame or motivate with hustle culture. ${energyGuide}
Turn this messy task dump into exactly 5 short lines. Line 1 is the smallest possible first action (under 12 words). Lines 2-5 are optional tiny next actions, one per line. Use plain language and concrete verbs. Do not add numbering, headings, explanations, or repeat the full dump.
TASK DUMP:
${raw.slice(0, 1800)}
TINY PLAN:`;
  const output = await model(prompt, { max_new_tokens: 115, do_sample: false });
  const text = Array.isArray(output) ? output[0]?.generated_text : "";
  if (!text) throw new Error("The model returned no text.");
  return parseModelOutput(text.replace(prompt, "").trim() || text.trim(), raw);
}

function renderPlan(plan) {
  emptyState.classList.add("hidden");
  result.classList.remove("hidden");
  planBadge.textContent = plan.fallback ? "QUICK MODE" : "READY";
  result.innerHTML = "";

  const kicker = document.createElement("div");
  kicker.className = "result-kicker";
  kicker.textContent = plan.fallback ? "A SMALLER START · LOCAL FALLBACK" : "YOUR PLAN · MADE WITH OPEN AI";
  const heading = document.createElement("h3");
  heading.textContent = plan.title;
  const intro = document.createElement("p");
  intro.className = "result-intro";
  intro.textContent = plan.intro;

  const next = document.createElement("div");
  next.className = "next-step";
  const label = document.createElement("span");
  label.className = "step-label";
  label.textContent = "THE ONLY THING YOU NEED TO DO FIRST";
  const nextText = document.createElement("strong");
  nextText.textContent = plan.next;
  const tinyNote = document.createElement("small");
  tinyNote.textContent = "You can stop here. Seriously.";
  next.append(label, nextText, tinyNote);

  const list = document.createElement("ul");
  list.className = "task-list";
  plan.tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.setAttribute("aria-label", `Mark complete: ${task.text}`);
    const body = document.createElement("div");
    const text = document.createElement("div");
    text.className = "task-text";
    text.textContent = task.text;
    const meta = document.createElement("span");
    meta.className = "task-meta";
    meta.textContent = task.meta;
    body.append(text, meta);
    checkbox.addEventListener("change", () => li.classList.toggle("done", checkbox.checked));
    li.append(checkbox, body);
    list.append(li);
  });

  const actions = document.createElement("div");
  actions.className = "result-actions";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "↗ Copy my plan";
  copy.addEventListener("click", async () => {
    const text = [plan.title, `FIRST: ${plan.next}`, ...plan.tasks.map((task) => `• ${task.text}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      notify("Plan copied. Go gently.");
    } catch {
      notify("Clipboard unavailable in this browser.");
    }
  });
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "↺ Start over";
  reset.addEventListener("click", () => {
    result.classList.add("hidden");
    emptyState.classList.remove("hidden");
    planBadge.textContent = "WAITING";
    dump.focus();
  });
  actions.append(copy, reset);
  const footnote = document.createElement("p");
  footnote.className = "result-footnote";
  footnote.textContent = plan.fallback
    ? "Quick mode is a simple fallback, not model output. Retry when the open model can load."
    : "AI can misunderstand tasks. Edit the plan in your head, ignore what doesn't fit, and keep the smallest step.";
  result.append(kicker, heading, intro, next, list, actions, footnote);
}

runButton.addEventListener("click", async () => {
  const raw = dump.value.trim();
  if (!raw) {
    notify("Drop a few tasks here first. Messy is fine.");
    dump.focus();
    return;
  }
  runButton.disabled = true;
  buttonText.textContent = "Making room…";
  setStatus("Preparing your tiny plan…", true);
  try {
    const plan = await generatePlan(raw);
    renderPlan(plan);
    setStatus(plan.fallback ? "Quick fallback ready · open model unavailable" : "Done · your text was processed in this browser");
    $("#outputPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.warn("Unburden model error:", error);
    renderPlan(fallbackPlan(raw));
    setStatus("Open model unavailable · showing clearly labelled quick fallback");
    notify("Couldn't load AI, so quick mode made a simple plan.");
  } finally {
    runButton.disabled = false;
    buttonText.textContent = "Make this feel lighter";
  }
});
