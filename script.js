(() => {
  "use strict";

  const LOCAL_API = "http://127.0.0.1:2200";
  const CLOUD_API = "https://mansik-santulan-score.onrender.com";
  let activeApi = LOCAL_API;
  let isApiOnline = false;

  const form = document.getElementById("predict-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const errorRetryBtn = document.getElementById("error-retry-btn");

  const stateIdle = document.getElementById("state-idle");
  const stateLoading = document.getElementById("state-loading");
  const stateResult = document.getElementById("state-result");
  const stateError = document.getElementById("state-error");

  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreContextEl = document.getElementById("score-context");
  const gaugeFill = document.getElementById("gauge-fill");
  const gaugeNeedleGroup = document.getElementById("gauge-needle-group");
  const errorLabelEl = document.getElementById("error-label");
  const errorCopyEl = document.getElementById("error-copy");

  const factorRatioEl = document.getElementById("factor-ratio");
  const factorIntensityEl = document.getElementById("factor-intensity");
  const factorVitalityEl = document.getElementById("factor-vitality");

  const statusPill = document.getElementById("api-status-pill");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const ambientGlow = document.getElementById("ambient-glow");
  const resultCard = document.getElementById("result-card");

  const GAUGE_ARC_LENGTH = 298.5;


  async function checkBackend() {
    statusDot.className = "status-dot checking";
    statusText.textContent = "Checking backend…";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900);
      const res = await fetch(`${LOCAL_API}/`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        activeApi = LOCAL_API;
        isApiOnline = true;
        statusDot.className = "status-dot online";
        statusText.textContent = "Local API :2200";
        statusPill.title = "Connected to local FastAPI server (http://127.0.0.1:2200)";
        return;
      }
    } catch (_) {
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${CLOUD_API}/`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        activeApi = CLOUD_API;
        isApiOnline = true;
        statusDot.className = "status-dot online";
        statusText.textContent = "Cloud API (Render)";
        statusPill.title = "Connected to Render Cloud API";
        return;
      }
    } catch (_) {
    }

    activeApi = LOCAL_API;
    isApiOnline = false;
    statusDot.className = "status-dot offline";
    statusText.textContent = "Offline (Click to retry)";
    statusPill.title = "Could not connect to backend. Click to test again.";
  }

  statusPill?.addEventListener("click", () => {
    checkBackend();
  });

  checkBackend();

  function drawTicks() {
    const cx = 130, cy = 145, rOuter = 95, rInner = 83, rText = 68;

    ["gauge-ticks-idle", "gauge-ticks-result"].forEach((id) => {
      const g = document.getElementById(id);
      if (!g) return;
      g.innerHTML = "";

      for (let i = 0; i <= 10; i += 2) {
        const angle = Math.PI - (i / 10) * Math.PI;
        const x1 = cx + rOuter * Math.cos(angle);
        const y1 = cy - rOuter * Math.sin(angle);
        const x2 = cx + rInner * Math.cos(angle);
        const y2 = cy - rInner * Math.sin(angle);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1.toFixed(1));
        line.setAttribute("y1", y1.toFixed(1));
        line.setAttribute("x2", x2.toFixed(1));
        line.setAttribute("y2", y2.toFixed(1));
        g.appendChild(line);

        const tx = cx + rText * Math.cos(angle);
        const ty = cy - rText * Math.sin(angle) + 3.5;
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", tx.toFixed(1));
        text.setAttribute("y", ty.toFixed(1));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-family", "var(--font-mono)");
        text.setAttribute("font-size", "9.5");
        text.setAttribute("fill", "rgba(255, 255, 255, 0.5)");
        text.textContent = String(i);
        g.appendChild(text);
      }
    });
  }
  drawTicks();

  const syncConfigs = [
    {
      rangeId: "range-avg_daily_usage_hours",
      inputId: "avg_daily_usage_hours",
      badgeId: "val-avg_daily_usage_hours",
      unit: " hrs",
      decimals: 1,
    },
    {
      rangeId: "range-daily_unlocks",
      inputId: "daily_unlocks",
      badgeId: "val-daily_unlocks",
      unit: " unlocks",
      decimals: 0,
    },
    {
      rangeId: "range-study_hours",
      inputId: "study_hours",
      badgeId: "val-study_hours",
      unit: " hrs",
      decimals: 1,
    },
    {
      rangeId: "range-physical_activity_hours",
      inputId: "physical_activity_hours",
      badgeId: "val-physical_activity_hours",
      unit: " hrs",
      decimals: 1,
    },
    {
      rangeId: "range-sleep_hours_per_night",
      inputId: "sleep_hours_per_night",
      badgeId: "val-sleep_hours_per_night",
      unit: " hrs",
      decimals: 1,
    },
  ];

  function updateSyncPair(config, value, source) {
    const num = parseFloat(value);
    const rangeEl = document.getElementById(config.rangeId);
    const inputEl = document.getElementById(config.inputId);
    const badgeEl = document.getElementById(config.badgeId);

    if (Number.isNaN(num)) return;

    if (source !== "range" && rangeEl) {
      rangeEl.value = num;
    }
    if (source !== "input" && inputEl) {
      inputEl.value = config.decimals === 0 ? Math.round(num) : num.toFixed(config.decimals);
    }
    if (badgeEl) {
      badgeEl.textContent = `${config.decimals === 0 ? Math.round(num) : num.toFixed(config.decimals)}${config.unit}`;
    }
  }

  syncConfigs.forEach((config) => {
    const rangeEl = document.getElementById(config.rangeId);
    const inputEl = document.getElementById(config.inputId);

    rangeEl?.addEventListener("input", (e) => {
      updateSyncPair(config, e.target.value, "range");
      clearFieldError(inputEl);
    });

    inputEl?.addEventListener("input", (e) => {
      updateSyncPair(config, e.target.value, "input");
      clearFieldError(inputEl);
    });
  });


  const segGroup = document.getElementById("stress_level_group");
  const stressHiddenInput = document.getElementById("stress_level");

  function selectStress(value) {
    segGroup.querySelectorAll(".seg-btn").forEach((btn) => {
      const match = btn.dataset.value === value;
      btn.classList.toggle("active", match);
      btn.setAttribute("aria-checked", match ? "true" : "false");
    });
    stressHiddenInput.value = value;
    clearFieldError(stressHiddenInput);
  }

  segGroup?.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectStress(btn.dataset.value);
    });
  });

  const presets = {
    balanced: {
      age: 21,
      gender: "Female",
      country: "India",
      academic_level: "Undergraduate",
      most_used_platform: "LinkedIn",
      purpose_of_use: "Education",
      avg_daily_usage_hours: 3.0,
      daily_unlocks: 45,
      study_hours: 5.5,
      physical_activity_hours: 1.5,
      sleep_hours_per_night: 7.5,
      stress_level: "Low",
    },
    finals: {
      age: 20,
      gender: "Male",
      country: "USA",
      academic_level: "Undergraduate",
      most_used_platform: "Instagram",
      purpose_of_use: "Entertainment",
      avg_daily_usage_hours: 7.5,
      daily_unlocks: 110,
      study_hours: 8.0,
      physical_activity_hours: 0.5,
      sleep_hours_per_night: 4.5,
      stress_level: "Very High",
    },
    nightowl: {
      age: 19,
      gender: "Male",
      country: "Canada",
      academic_level: "High School",
      most_used_platform: "YouTube",
      purpose_of_use: "Entertainment",
      avg_daily_usage_hours: 8.5,
      daily_unlocks: 90,
      study_hours: 2.0,
      physical_activity_hours: 0.5,
      sleep_hours_per_night: 5.0,
      stress_level: "High",
    },
    minimalist: {
      age: 24,
      gender: "Female",
      country: "UK",
      academic_level: "Graduate",
      most_used_platform: "WhatsApp",
      purpose_of_use: "Networking",
      avg_daily_usage_hours: 1.5,
      daily_unlocks: 25,
      study_hours: 4.0,
      physical_activity_hours: 2.5,
      sleep_hours_per_night: 8.0,
      stress_level: "Low",
    },
  };

  function applyPreset(key) {
    const data = presets[key];
    if (!data) return;

    clearAllErrors();

    // Fill profile fields
    const ageEl = document.getElementById("age");
    if (ageEl) ageEl.value = data.age;

    const genderEl = document.getElementById("gender");
    if (genderEl) genderEl.value = data.gender;

    const countryEl = document.getElementById("country");
    if (countryEl) countryEl.value = data.country;

    // Academic & Habits
    const acadEl = document.getElementById("academic_level");
    if (acadEl) acadEl.value = data.academic_level;

    const platEl = document.getElementById("most_used_platform");
    if (platEl) platEl.value = data.most_used_platform;

    const purpEl = document.getElementById("purpose_of_use");
    if (purpEl) purpEl.value = data.purpose_of_use;

    syncConfigs.forEach((cfg) => {
      const val = data[cfg.inputId];
      if (val !== undefined) {
        updateSyncPair(cfg, val, "preset");
      }
    });

    selectStress(data.stress_level);

    document.querySelectorAll(".chip-btn").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.preset === key);
    });
  }

  document.querySelectorAll(".chip-btn").forEach((chip) => {
    chip.addEventListener("click", () => {
      applyPreset(chip.dataset.preset);
    });
  });


  const formCard = document.getElementById("form-card");
  if (formCard) {
    formCard.addEventListener("mousemove", (e) => {
      const rect = formCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      formCard.style.setProperty("--spot-x", `${x}px`);
      formCard.style.setProperty("--spot-y", `${y}px`);
    });
  }

  const tiltCards = document.querySelectorAll(".tilt-card");
  tiltCards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const normX = (x / rect.width) * 2 - 1; // -1 to 1
      const normY = (y / rect.height) * 2 - 1; // -1 to 1

      const maxTilt = 2.5;
      const rotX = (-normY * maxTilt).toFixed(2);
      const rotY = (normX * maxTilt).toFixed(2);

      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.004, 1.004, 1.004)`;
      card.style.setProperty("--glare-x", `${(x / rect.width) * 100}%`);
      card.style.setProperty("--glare-y", `${(y / rect.height) * 100}%`);
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    });
  });


  function fieldWrapper(input) {
    return input ? input.closest(".field") : null;
  }

  function setFieldError(input, message) {
    const wrap = fieldWrapper(input);
    if (!wrap) return;
    wrap.classList.add("field-error");
    const msgEl = wrap.querySelector(".error-msg");
    if (msgEl) msgEl.textContent = message;
  }

  function clearFieldError(input) {
    const wrap = fieldWrapper(input);
    if (!wrap) return;
    wrap.classList.remove("field-error");
    const msgEl = wrap.querySelector(".error-msg");
    if (msgEl) msgEl.textContent = "";
  }

  function clearAllErrors() {
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("field-error"));
    form.querySelectorAll(".error-msg").forEach((m) => (m.textContent = ""));
  }

  function validate(payload) {
    const errors = [];

    const numericChecks = [
      ["age", 10, 100],
      ["avg_daily_usage_hours", 0, 24],
      ["daily_unlocks", 0, Infinity],
      ["study_hours", 0, 24],
      ["physical_activity_hours", 0, 24],
      ["sleep_hours_per_night", 0, 24],
    ];

    numericChecks.forEach(([key, min, max]) => {
      const input = document.getElementById(key);
      const val = payload[key];
      if (val === "" || val === null || Number.isNaN(val)) {
        errors.push([input, "This field is required."]);
      } else if (val < min || val > max) {
        errors.push([input, `Must be between ${min} and ${max === Infinity ? "0+" : max}.`]);
      }
    });

    ["gender", "country", "academic_level", "most_used_platform", "purpose_of_use"].forEach((key) => {
      const input = document.getElementById(key);
      if (!payload[key] || String(payload[key]).trim() === "") {
        errors.push([input, "This field is required."]);
      }
    });

    if (!payload.stress_level) {
      errors.push([stressHiddenInput, "Pick a stress level."]);
    }

    return errors;
  }

  function collectPayload() {
    const fd = new FormData(form);
    return {
      age: fd.get("age") === "" ? NaN : parseInt(fd.get("age"), 10),
      gender: fd.get("gender") || "",
      country: (fd.get("country") || "").trim(),
      academic_level: fd.get("academic_level") || "",
      most_used_platform: fd.get("most_used_platform") || "",
      purpose_of_use: fd.get("purpose_of_use") || "",
      avg_daily_usage_hours: fd.get("avg_daily_usage_hours") === "" ? NaN : parseFloat(fd.get("avg_daily_usage_hours")),
      daily_unlocks: fd.get("daily_unlocks") === "" ? NaN : parseInt(fd.get("daily_unlocks"), 10),
      study_hours: fd.get("study_hours") === "" ? NaN : parseFloat(fd.get("study_hours")),
      physical_activity_hours: fd.get("physical_activity_hours") === "" ? NaN : parseFloat(fd.get("physical_activity_hours")),
      sleep_hours_per_night: fd.get("sleep_hours_per_night") === "" ? NaN : parseFloat(fd.get("sleep_hours_per_night")),
      stress_level: fd.get("stress_level") || "",
    };
  }


  function showState(name) {
    const states = {
      idle: stateIdle,
      loading: stateLoading,
      result: stateResult,
      error: stateError,
    };

    Object.keys(states).forEach((key) => {
      const el = states[key];
      if (!el) return;
      if (key === name) {
        el.hidden = false;
        el.classList.add("active");
      } else {
        el.hidden = true;
        el.classList.remove("active");
      }
    });
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.classList.toggle("loading", isSubmitting);
  }


  let counterAnimationId = null;

  function animateScoreNumber(targetVal, duration = 1200) {
    if (counterAnimationId) cancelAnimationFrame(counterAnimationId);

    const startVal = 0;
    const startTime = performance.now();

    function update(time) {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);

      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetVal - startVal) * ease;

      scoreNumberEl.textContent = current.toFixed(2);

      if (progress < 1) {
        counterAnimationId = requestAnimationFrame(update);
      } else {
        scoreNumberEl.textContent = targetVal.toFixed(2);
      }
    }

    counterAnimationId = requestAnimationFrame(update);
  }


  function bandFor(score) {
    if (score < 4.0) {
      return {
        label: "Signal: Strained Rhythm",
        context: "Your pattern reflects heightened cognitive or digital fatigue. Restorative sleep and digital boundaries can build recovery resilience.",
        color: "rgba(255, 90, 82, 0.35)",
      };
    }
    if (score < 7.0) {
      return {
        label: "Signal: Balanced Baseline",
        context: "Your routine demonstrates steady grounding with moderate lifestyle load. Minor tweaks to screen distribution can elevate wellness.",
        color: "rgba(229, 161, 29, 0.28)",
      };
    }
    return {
      label: "Signal: Resilient Baseline",
      context: "Your daily habits point to a resilient, well-supported physiological baseline. Keep nourishing this consistent rhythm.",
      color: "rgba(45, 212, 191, 0.35)",
    };
  }

  function computeBreakdown(payload) {
    // 1. Sleep-to-Screen Ratio
    const sleep = payload.sleep_hours_per_night || 7;
    const screen = payload.avg_daily_usage_hours || 4;
    const ratio = screen > 0 ? (sleep / screen).toFixed(1) : "—";
    if (factorRatioEl) {
      factorRatioEl.textContent = `${ratio}x`;
    }

    // 2. Digital Intensity Index
    const unlocks = payload.daily_unlocks || 50;
    let intensity = "Moderate";
    if (screen > 7 || unlocks > 100) intensity = "High";
    else if (screen < 3 && unlocks < 40) intensity = "Gentle";
    if (factorIntensityEl) {
      factorIntensityEl.textContent = intensity;
    }

    // 3. Physical Vitality Balance
    const activity = payload.physical_activity_hours || 1;
    let vitality = "Standard";
    if (activity >= 2.0 && sleep >= 7.5) vitality = "Optimal";
    else if (activity < 0.5) vitality = "Low Activity";
    if (factorVitalityEl) {
      factorVitalityEl.textContent = vitality;
    }
  }

  function renderResult(score, payload) {
    const clamped = Math.max(0, Math.min(10, score));
    const { label, context, color } = bandFor(clamped);

    scoreBandEl.textContent = label;
    scoreContextEl.textContent = context;

    if (payload) computeBreakdown(payload);

    if (resultCard) {
      resultCard.style.setProperty("--glow-color", color);
    }
    if (ambientGlow) {
      ambientGlow.style.background = `radial-gradient(900px 500px at 80% 20%, ${color}, transparent 70%)`;
    }

    showState("result");

    animateScoreNumber(score, 1200);

    gaugeFill.style.transition = "none";
    gaugeFill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);

    const angleDeg = (clamped / 10) * 180 - 90;
    gaugeNeedleGroup.style.transform = "rotate(-90deg)";

    requestAnimationFrame(() => {
      gaugeFill.style.transition = "stroke-dashoffset 1.3s cubic-bezier(0.25, 1, 0.5, 1)";
      const offset = GAUGE_ARC_LENGTH * (1 - clamped / 10);
      gaugeFill.style.strokeDashoffset = String(offset);

      gaugeNeedleGroup.style.transform = `rotate(${angleDeg.toFixed(1)}deg)`;
    });
  }

  function renderError(label, copy) {
    if (errorLabelEl) errorLabelEl.textContent = label;
    if (errorCopyEl) errorCopyEl.textContent = copy;
    showState("error");
  }


  function applyServerValidationErrors(detail) {
    if (!Array.isArray(detail)) return false;
    let matched = false;
    detail.forEach((err) => {
      const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : null;
      const input = field ? document.getElementById(field) : null;
      const target = field === "stress_level" ? stressHiddenInput : input;
      if (target) {
        setFieldError(target, err.msg || "Invalid value.");
        matched = true;
      }
    });
    return matched;
  }

  async function callPredictionApi(payload) {
    const endpointsToTry = [activeApi];
    const alternative = activeApi === LOCAL_API ? CLOUD_API : LOCAL_API;
    endpointsToTry.push(alternative);

    let lastError = null;

    for (const baseUrl of endpointsToTry) {
      try {
        const controller = new AbortController();
        const timeoutMs = baseUrl === LOCAL_API ? 4000 : 9000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(`${baseUrl}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok || res.status === 422) {
          activeApi = baseUrl;
          isApiOnline = true;
          statusDot.className = "status-dot online";
          statusText.textContent = baseUrl === LOCAL_API ? "Local API :2200" : "Cloud API";
          return { res, baseUrl };
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("Failed to reach prediction API");
  }


  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors();

    const payload = collectPayload();
    const clientErrors = validate(payload);

    if (clientErrors.length > 0) {
      clientErrors.forEach(([input, msg]) => input && setFieldError(input, msg));
      clientErrors[0][0]?.focus?.();
      return;
    }

    setSubmitting(true);
    showState("loading");

    try {
      const { res } = await callPredictionApi(payload);

      if (res.status === 422) {
        const body = await res.json().catch(() => null);
        const matched = body && applyServerValidationErrors(body.detail);
        renderError(
          "Check your inputs",
          matched
            ? "The model rejected a few values — details are marked on the form."
            : "The API rejected this submission. Please review your inputs."
        );
        return;
      }

      if (!res.ok) {
        let detailMsg = `The API responded with HTTP ${res.status}.`;
        const body = await res.json().catch(() => null);
        if (body && typeof body.detail === "string") detailMsg = body.detail;
        renderError("Prediction failed", detailMsg);
        return;
      }

      const data = await res.json();
      if (typeof data.predicted_mental_health_score !== "number") {
        renderError("Unexpected response", "The API responded, but the score was missing or malformed.");
        return;
      }

      renderResult(data.predicted_mental_health_score, payload);
    } catch (err) {
      statusDot.className = "status-dot offline";
      statusText.textContent = "Offline";
      renderError(
        "Can't reach prediction service",
        "Could not connect to the local server or cloud fallback. If running locally, start the backend with: uvicorn main:app --port 2200"
      );
    } finally {
      setSubmitting(false);
    }
  });


  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => clearFieldError(el));
    el.addEventListener("change", () => clearFieldError(el));
  });

  resetBtn?.addEventListener("click", () => {
    showState("idle");
  });

  errorRetryBtn?.addEventListener("click", () => {
    showState("idle");
  });


  const canvas = document.getElementById("ambient-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 26 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 1.2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.35 + 0.15,
    }));

    function drawAmbientParticles() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45, 212, 191, ${p.alpha})`;
        ctx.fill();
      });

      requestAnimationFrame(drawAmbientParticles);
    }
    requestAnimationFrame(drawAmbientParticles);
  }

  applyPreset("balanced");
})();
