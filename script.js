
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "/api";

  // State Management
  let state = {
    history: JSON.parse(localStorage.getItem("cyberHistory")) || [],
    xp: parseInt(localStorage.getItem("cyberXP")) || 0,
    achievements: JSON.parse(localStorage.getItem("cyberAchievements")) || [],
    lang: "en",
    mode: "normal",
  };

  // UI Elements
  const navLinks = document.querySelectorAll("nav a");
  const themeToggle = document.getElementById("theme-toggle");
  const langSelect = document.getElementById("lang-select");
  const modeSelect = document.getElementById("mode-select");
  const historyList = document.getElementById("history-list");
  const xpBarFill = document.getElementById("xp-bar-fill");
  const xpText = document.getElementById("xp-text");
  const userRank = document.getElementById("user-rank");
  const totalScoreEl = document.getElementById("total-security-score");

  // --------------------------------------------------
  // CORE SYSTEMS: GAMIFICATION & PROFILE
  // --------------------------------------------------
  function updateGamificationUI() {
    const levels = [
      { name: "Beginner", min: 0 },
      { name: "Aware", min: 200 },
      { name: "Defender", min: 500 },
      { name: "Cyber Pro", min: 1000 },
    ];

    let currentLevel = levels[0];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (state.xp >= levels[i].min) {
        currentLevel = levels[i];
        break;
      }
    }

    userRank.textContent = currentLevel.name;
    const nextLevel = levels.find((l) => l.min > state.xp) || {
      min: state.xp + 100,
    };
    const progress =
      ((state.xp - currentLevel.min) / (nextLevel.min - currentLevel.min)) *
      100;
    xpBarFill.style.width = `${progress}%`;
    xpText.textContent = `${state.xp} XP`;

    // Update Achievements
    const achList = document.getElementById("achievements-list");
    achList.innerHTML = "";
    state.achievements.forEach((ach) => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = ach;
      achList.appendChild(span);
    });

    // Overall Score (Mock Calculation)
    const avgScore =
      state.history.length > 0
        ? Math.round(
            state.history.reduce(
              (acc, curr) => acc + (100 - (curr.score || 0)),
              0,
            ) / state.history.length,
          )
        : 0;
    totalScoreEl.textContent = avgScore;
  }

  function addXP(amount, achievement = null) {
    state.xp += amount;
    if (achievement && !state.achievements.includes(achievement)) {
      state.achievements.push(achievement);
    }
    localStorage.setItem("cyberXP", state.xp);
    localStorage.setItem(
      "cyberAchievements",
      JSON.stringify(state.achievements),
    );
    updateGamificationUI();
  }

  // --------------------------------------------------
  // LOCALIZATION & THEME
  // --------------------------------------------------
  langSelect.addEventListener("change", (e) => (state.lang = e.target.value));
  modeSelect.addEventListener("change", (e) => (state.mode = e.target.value));

  themeToggle.addEventListener("click", () => {
    const body = document.documentElement;
    const isLight = body.getAttribute("data-theme") === "light";
    body.setAttribute("data-theme", isLight ? "dark" : "light");
    themeToggle.innerHTML = isLight
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
  });

  // --------------------------------------------------
  // HISTORY
  // --------------------------------------------------
  function renderHistory() {
    historyList.innerHTML = "";
    state.history
      .slice()
      .reverse()
      .forEach((item) => {
        const li = document.createElement("li");
        li.className = `history-item ${item.safe ? "safe" : "danger"}`;
        li.textContent = `[${item.type}] ${item.value.substring(0, 25)}...`;
        historyList.appendChild(li);
      });
  }

  function addHistory(type, value, isSafe, score) {
    state.history.push({ type, value, safe: isSafe, score, time: Date.now() });
    if (state.history.length > 10) state.history.shift();
    localStorage.setItem("cyberHistory", JSON.stringify(state.history));
    renderHistory();
    updateGamificationUI();
  }

  document.getElementById("clear-history").addEventListener("click", () => {
    state.history = [];
    localStorage.removeItem("cyberHistory");
    renderHistory();
    updateGamificationUI();
  });

  // --------------------------------------------------
  // ANALYZERS (URL, Password, Email)
  // --------------------------------------------------
  async function handleScan(
    type,
    inputId,
    resultId,
    loadingId,
    endpoint,
    bodyKey,
  ) {
    const input = document.getElementById(inputId).value.trim();
    if (!input) return;

    const resContainer = document.getElementById(resultId);
    const loading = document.getElementById(loadingId);
    resContainer.classList.add("hidden");
    loading.classList.remove("hidden");

    try {
      const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [bodyKey]: input,
          mode: state.mode,
          lang: state.lang,
        }),
      });
      const data = await res.json();

      setTimeout(() => {
        loading.classList.add("hidden");
        resContainer.classList.remove("hidden");

        // Update UI based on type
        if (type === "URL" || type === "Email") {
          const statusEl = document.getElementById(
            `${type.toLowerCase()}-status`,
          );
          statusEl.textContent = data.classification.toUpperCase();
          statusEl.className = `status ${data.classification.toLowerCase()}`;
          updateRing(
            document.getElementById(`${type.toLowerCase()}-circle`),
            document.getElementById(`${type.toLowerCase()}-score-text`),
            data.score,
          );

          const list = document.getElementById(
            `${type.toLowerCase()}-explanations-list`,
          );
          list.innerHTML = "";
          data.explanations.forEach((ex) => {
            const li = document.createElement("li");
            li.textContent = ex;
            list.appendChild(li);
          });

          // Action Guide & What If (for URL)
          if (type === "URL") {
            const extraInfo = document.getElementById("url-extra-info");
            const actionText = document.getElementById("url-action-text");
            const consequenceText = document.getElementById(
              "url-consequence-text",
            );

            if (data.classification === "Safe") {
              extraInfo.classList.add("hidden");
            } else {
              extraInfo.classList.remove("hidden");
              actionText.textContent =
                "Do not enter any personal credentials or payment info. Close the tab immediately and report the link if it came from a known contact.";
              consequenceText.textContent =
                "If you had entered your password here, an attacker would have full access to your account within minutes, potentially locking you out and stealing your data.";
            }
          }

          addHistory(
            type,
            input,
            data.classification === "Safe" ||
              (data.classification === "Suspicious" && data.score < 50),
            data.score,
          );
          addXP(10);
        } else if (type === "Password") {
          document.getElementById("pwd-meter-fill").style.width =
            `${data.score}%`;
          document.getElementById("pwd-score-number").textContent =
            `${data.score}/100`;
          document.getElementById("pwd-status-text").textContent =
            data.strength;
          document.getElementById("pwd-crack-time").textContent =
            data.crack_time;
          document.getElementById("pwd-entropy").textContent = data.entropy;

          const list = document.getElementById("pwd-explanations-list");
          list.innerHTML = "";
          data.explanations.forEach((ex) => {
            const li = document.createElement("li");
            li.textContent = ex;
            list.appendChild(li);
          });
          if (data.strength === "Strong") addXP(20, "Master Keysmith");
          addXP(5);
        }
      }, 600);
    } catch (e) {
      console.error(e);
      loading.classList.add("hidden");
    }
  }

  document.getElementById("url-form").addEventListener("submit", (e) => {
    e.preventDefault();
    handleScan(
      "URL",
      "url-input",
      "url-result",
      "url-loading",
      "check-url",
      "url",
    );
  });

  document.getElementById("email-form").addEventListener("submit", (e) => {
    e.preventDefault();
    handleScan(
      "Email",
      "email-input",
      "email-result",
      "email-loading",
      "check-email",
      "email",
    );
  });

  const pwdInput = document.getElementById("password-input");
  let pwdDebounce;
  pwdInput.addEventListener("input", () => {
    clearTimeout(pwdDebounce);
    if (!pwdInput.value) return;
    pwdDebounce = setTimeout(
      () =>
        handleScan(
          "Password",
          "password-input",
          "pwd-result",
          "url-loading",
          "check-password",
          "password",
        ),
      500,
    );
  });

  // Ring Helper
  function updateRing(circleEl, textEl, score) {
    circleEl.setAttribute("stroke-dasharray", `${score}, 100`);
    textEl.textContent = `${score}%`;
    let color = "#10b981";
    if (score >= 40) color = "#f59e0b";
    if (score >= 70) color = "#ef4444";
    circleEl.style.stroke = color;
  }

  // --------------------------------------------------
  // SIMULATION MODE
  // --------------------------------------------------
  const scenarios = [
    {
      title: "Urgent Bank Alert",
      content:
        "From: security@bank-verify-alert.com\nSubject: URGENT: Account Suspended\n\nDear User, we detected suspicious activity. Click here to verify: http://192.168.1.5/login",
      correct: "report",
      explanation:
        "This uses an urgent tone, a suspicious domain, and an IP address link. Reporting was the right choice!",
    },
    {
      title: "Unsubscribe Link",
      content:
        "You are receiving this because you signed up for our newsletter. If you wish to stop receiving these emails, click here: https://newsletter.official.com/unsubscribe",
      correct: "click",
      explanation:
        "This is a standard, safe unsubscribe link from a legitimate domain. Safe to interact.",
    },
    {
      title: "Gift Card Prize",
      content:
        "CONGRATULATIONS! You've won a $1000 Amazon Gift Card. Just fill out this form to claim: http://amaz0n-rewards.net/claim",
      correct: "report",
      explanation:
        "Classic phishing! Note the typosquatted domain 'amaz0n' and the 'too good to be true' offer.",
    },
  ];

  let currentSim = 0;
  function loadScenario() {
    const s = scenarios[currentSim];
    document.getElementById("sim-title").textContent = s.title;
    document.getElementById("sim-content").textContent = s.content;
    document.getElementById("sim-feedback").classList.add("hidden");
  }

  document.querySelectorAll(".sim-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const s = scenarios[currentSim];
      const feedback = document.getElementById("sim-feedback");
      const status = document.getElementById("sim-status");
      const expl = document.getElementById("sim-explanation");

      feedback.classList.remove("hidden");
      if (action === s.correct) {
        status.textContent = "CORRECT!";
        status.className = "status safe";
        addXP(50, "Scam Hunter");
      } else {
        status.textContent = "Ouch! Careful.";
        status.className = "status suspicious";
      }
      expl.textContent = s.explanation;
    });
  });

  document.getElementById("next-sim-btn").addEventListener("click", () => {
    currentSim = (currentSim + 1) % scenarios.length;
    loadScenario();
  });

  // --------------------------------------------------
  // CYBER ASSISTANT (Chat)
  // --------------------------------------------------
  const assistantTrigger = document.getElementById("open-assistant");
  const assistantWidget = document.getElementById("assistant-widget");
  const assistantClose = document.getElementById("close-assistant");
  const assistantInput = document.getElementById("assistant-input");
  const assistantSend = document.getElementById("assistant-send");
  const chatArea = document.getElementById("assistant-chat");

  const faq = {
    phishing:
      "Phishing is a trick where hackers pretend to be someone else (like a bank) to steal your info. Always check the URL!",
    password:
      "A strong password has 12+ chars, symbols, numbers, and both case letters. Never reuse them!",
    https:
      "HTTPS means your connection is encrypted. Never enter passwords on sites that only have HTTP.",
    score:
      "Your security score improves as you use strong passwords and pass simulations!",
    hello: "Hello! I'm CyberGuard AI. Ask me about digital safety.",
    default:
      "I'm not sure about that. Try asking about 'phishing', 'passwords', or 'HTTPS'.",
  };

  assistantTrigger.addEventListener("click", () =>
    assistantWidget.classList.remove("assistant-collapsed"),
  );
  assistantClose.addEventListener("click", () =>
    assistantWidget.classList.add("assistant-collapsed"),
  );

  function addMsg(text, sender) {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    div.textContent = text;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  assistantSend.addEventListener("click", () => {
    const val = assistantInput.value.toLowerCase().trim();
    if (!val) return;
    addMsg(assistantInput.value, "user");
    assistantInput.value = "";

    setTimeout(() => {
      let response = faq["default"];
      for (let key in faq) {
        if (val.includes(key)) {
          response = faq[key];
          break;
        }
      }
      addMsg(response, "bot");
    }, 500);
  });

  // --------------------------------------------------
  // PDF REPORT GENERATION
  // --------------------------------------------------
  document
    .getElementById("download-report-btn")
    .addEventListener("click", () => {
      const { jsPDF } = window.jspdf;
      const doc = jsPDF();

      doc.setFontSize(22);
      doc.text("CyberGuard Security Report", 20, 20);

      doc.setFontSize(14);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`User Rank: ${userRank.textContent}`, 20, 40);
      doc.text(`Total XP: ${state.xp}`, 20, 50);
      doc.text(`Security Score: ${totalScoreEl.textContent}/100`, 20, 60);

      doc.text("Recent Activity:", 20, 80);
      let y = 90;
      state.history.forEach((item, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.text(
          `${i + 1}. [${item.type}] ${item.value.substring(0, 50)} - ${item.safe ? "SAFE" : "RISKY"}`,
          20,
          y,
        );
        y += 10;
      });

      doc.save("CyberGuard_Security_Report.pdf");
      addXP(30, "Report Master");
    });

  // Initialize
  renderHistory();
  updateGamificationUI();
  loadScenario();

  // Voice Input Helper (Re-applying from previous state)
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  function setupVoice(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!SpeechRecognition || !btn) return;
    const rec = new SpeechRecognition();
    btn.addEventListener("click", () => {
      rec.start();
      btn.classList.add("recording");
    });
    rec.onresult = (e) => {
      input.value = e.results[0][0].transcript;
      btn.classList.remove("recording");
    };
    rec.onend = () => btn.classList.remove("recording");
  }
  setupVoice("voice-url-btn", "url-input");
  setupVoice("voice-email-btn", "email-input");

  // Smooth Scroll
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      navLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");
      const target = document.querySelector(this.getAttribute("href"));
      window.scrollTo({ top: target.offsetTop - 100, behavior: "smooth" });
    });
  });
});
