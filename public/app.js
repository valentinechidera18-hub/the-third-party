const STARTERS = [
  {
    character: "a silver-haired fox spirit in a crimson coat",
    setting: "a floating library above storm clouds",
  },
  {
    character: "a clockwork detective with a brass monocle",
    setting: "a rain-slicked neon alley in 1920s Neo-Tokyo",
  },
  {
    character: "a young witch who can only cast spells backward",
    setting: "an overgrown greenhouse on the edge of a forgotten forest",
  },
  {
    character: "a retired pirate captain with a map tattooed on their back",
    setting: "a shipwrecked tavern that drifts between tides of time",
  },
  {
    character: "a soft-spoken android gardener tending ancient ruins",
    setting: "a moonlit desert oasis under twin purple moons",
  },
];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const setupEl = $("#setup");
const storyEl = $("#story");
const characterInput = $("#character");
const settingInput = $("#setting");
const btnStart = $("#btn-start");
const btnRestart = $("#btn-restart");
const btnCustom = $("#btn-custom");
const customInput = $("#custom-input");
const sceneTextEl = $("#scene-text");
const loadingTextEl = $("#loading-text");
const illustrationEl = $("#illustration");
const illustrationPlaceholder = $("#illustration-placeholder");
const sceneVideo = $("#scene-video");
const videoBadge = $("#video-badge");
const videoBadgeText = $("#video-badge-text");
const choicesEl = $("#choices");
const choicesSection = $("#choices-section");
const metaCharacter = $("#meta-character");
const metaSetting = $("#meta-setting");
const toastEl = $("#toast");
const starterChips = $("#starter-chips");

let state = {
  responseId: null,
  character: "",
  setting: "",
  loading: false,
  videoPollTimer: null,
};

function showToast(msg, duration = 4000) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), duration);
}

function setLoading(isLoading, isStart = false) {
  state.loading = isLoading;

  if (isStart) {
    btnStart.disabled = isLoading || !characterInput.value.trim() || !settingInput.value.trim();
    btnStart.querySelector(".btn-text").classList.toggle("hidden", isLoading);
    btnStart.querySelector(".btn-spinner").classList.toggle("hidden", !isLoading);
  }

  if (!isStart) {
    choicesSection.classList.toggle("hidden", isLoading);
    loadingTextEl.classList.toggle("hidden", !isLoading);
    sceneTextEl.classList.toggle("hidden", isLoading);

    illustrationPlaceholder.classList.toggle("hidden", !isLoading);
    if (isLoading) {
      illustrationEl.classList.add("hidden");
      hideVideo();
    }

    $$(".choice-btn").forEach((b) => (b.disabled = isLoading));
    btnCustom.disabled = isLoading || !customInput.value.trim();
    customInput.disabled = isLoading;
  }
}

function updateStartButton() {
  const ready = characterInput.value.trim() && settingInput.value.trim() && !state.loading;
  btnStart.disabled = !ready;
}

function renderStarters() {
  starterChips.innerHTML = "";
  STARTERS.forEach((s) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = `${s.character.split(" ").slice(0, 4).join(" ")}…`;
    chip.title = `${s.character} — ${s.setting}`;
    chip.addEventListener("click", () => {
      characterInput.value = s.character;
      settingInput.value = s.setting;
      updateStartButton();
    });
    starterChips.appendChild(chip);
  });
}

function renderChoices(choices) {
  choicesEl.innerHTML = "";
  choices.forEach((text) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.type = "button";
    btn.textContent = text;
    btn.addEventListener("click", () => continueStory(text));
    choicesEl.appendChild(btn);
  });
}

function hideVideo() {
  if (state.videoPollTimer) {
    clearInterval(state.videoPollTimer);
    state.videoPollTimer = null;
  }
  sceneVideo.pause();
  sceneVideo.removeAttribute("src");
  sceneVideo.load();
  sceneVideo.classList.add("hidden");
  videoBadge.classList.add("hidden");
  videoBadge.classList.remove("ready");
}

function showVideo(url) {
  sceneVideo.src = url;
  sceneVideo.classList.remove("hidden");
  sceneVideo.play().catch(() => {});
  videoBadge.classList.remove("hidden");
  videoBadge.classList.add("ready");
  videoBadgeText.textContent = "Clip playing";
}

function startVideoPoll(jobId) {
  hideVideo();
  if (!jobId) return;

  videoBadge.classList.remove("hidden", "ready");
  videoBadgeText.textContent = "Animating…";

  let attempts = 0;
  const maxAttempts = 60;

  state.videoPollTimer = setInterval(async () => {
    attempts += 1;
    if (attempts > maxAttempts) {
      clearInterval(state.videoPollTimer);
      state.videoPollTimer = null;
      videoBadgeText.textContent = "Clip unavailable";
      return;
    }
    try {
      const res = await fetch(`/api/video-status/${jobId}`);
      const data = await res.json();
      if (data.status === "ready" && data.videoUrl) {
        clearInterval(state.videoPollTimer);
        state.videoPollTimer = null;
        showVideo(data.videoUrl);
      } else if (data.status === "failed") {
        clearInterval(state.videoPollTimer);
        state.videoPollTimer = null;
        videoBadge.classList.add("hidden");
        console.warn("Video failed:", data.error);
      }
    } catch (e) {
      console.warn("Video poll error", e);
    }
  }, 3000);
}

function showScene({ sceneText, choices, image, responseId, videoJobId }) {
  state.responseId = responseId;

  const paragraphs = sceneText
    .split(/\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim()}</p>`)
    .join("");
  sceneTextEl.innerHTML = paragraphs;

  hideVideo();

  if (image) {
    illustrationEl.src = image;
    illustrationEl.onload = () => {
      illustrationEl.classList.remove("hidden");
      illustrationPlaceholder.classList.add("hidden");
    };
    illustrationEl.onerror = () => {
      illustrationPlaceholder.classList.add("hidden");
    };
  } else {
    illustrationPlaceholder.classList.add("hidden");
    illustrationEl.classList.add("hidden");
  }

  renderChoices(choices || []);
  customInput.value = "";
  btnCustom.disabled = true;

  if (videoJobId) {
    startVideoPoll(videoJobId);
  }
}

async function startStory() {
  const character = characterInput.value.trim();
  const setting = settingInput.value.trim();
  if (!character || !setting) return;

  setLoading(true, true);

  try {
    const res = await fetch("/api/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character, setting }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to start story");

    state.character = character;
    state.setting = setting;
    metaCharacter.textContent = character;
    metaSetting.textContent = setting;

    setupEl.classList.add("hidden");
    storyEl.classList.remove("hidden");

    showScene(data);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Something went wrong. Check your API keys.");
  } finally {
    setLoading(false, true);
  }
}

async function continueStory(choice, customAction = null) {
  if (state.loading || !state.responseId) return;

  setLoading(true, false);

  try {
    const res = await fetch("/api/continue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choice,
        customAction,
        previousResponseId: state.responseId,
        character: state.character,
        setting: state.setting,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to continue story");

    showScene(data);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not continue the story.");
  } finally {
    setLoading(false, false);
  }
}

function restart() {
  hideVideo();
  state = { responseId: null, character: "", setting: "", loading: false, videoPollTimer: null };
  storyEl.classList.add("hidden");
  setupEl.classList.remove("hidden");
  sceneTextEl.innerHTML = "";
  illustrationEl.src = "";
  illustrationEl.classList.add("hidden");
  illustrationPlaceholder.classList.remove("hidden");
  choicesEl.innerHTML = "";
  customInput.value = "";
  characterInput.value = "";
  settingInput.value = "";
  updateStartButton();
}

characterInput.addEventListener("input", updateStartButton);
settingInput.addEventListener("input", updateStartButton);
btnStart.addEventListener("click", startStory);
btnRestart.addEventListener("click", restart);

customInput.addEventListener("input", () => {
  btnCustom.disabled = !customInput.value.trim() || state.loading;
});
customInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && customInput.value.trim() && !state.loading) {
    continueStory(null, customInput.value.trim());
  }
});
btnCustom.addEventListener("click", () => {
  if (customInput.value.trim()) continueStory(null, customInput.value.trim());
});

renderStarters();
updateStartButton();
