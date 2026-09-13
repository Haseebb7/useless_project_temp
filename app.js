/* ------------------------------------------------------------------
   PROCRASTINATION POLICE — REVERSE BREAK ENFORCER (APP LOGIC)
   Swapped Logic: Monitors Continuous Active Work Duration and
   enforces healthy break schedules across 4 escalating Levels.
------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  // Config & Threshold Modes
  const THRESHOLDS = {
    demo: {
      name: 'Demo Mode (Seconds)',
      l1Max: 120,   // Level 1: < 2 min (120s)
      l2Max: 300,   // Level 2: 2–5 min (300s)
      l3Max: 600,   // Level 3: 5–10 min (600s)
      // Level 4: 600s+
      breakDuration: 30, // 30s mandatory rest for demo
      idleTimeout: 15,   // 15s inactivity = resting
      labels: {
        l1: 'Active < 2 min continuous',
        l2: 'Active 2–5 min continuous',
        l3: 'Active 5–10 min + Warning Siren',
        l4: 'Active 10+ min continuous'
      }
    },
    real: {
      name: 'Real Mode (Minutes)',
      l1Max: 1500,  // Level 1: < 25 mins (1500s)
      l2Max: 2700,  // Level 2: 25–45 mins (2700s)
      l3Max: 3600,  // Level 3: 45–60 mins (3600s)
      // Level 4: 60 mins+ (3600s+)
      breakDuration: 300, // 5 min mandatory break
      idleTimeout: 120,   // 2 min inactivity = resting
      labels: {
        l1: 'Active < 25 min continuous',
        l2: 'Active 25–45 min continuous',
        l3: 'Active 45–60 min + Warning Siren',
        l4: 'Active 60+ min continuous'
      }
    }
  };

  // State Variables
  let isDemoMode = true;
  let currentConfig = THRESHOLDS.demo;
  
  let activeWorkSeconds = 0;
  let totalWorkSecondsToday = 0;
  let breaksTaken = 0;
  let interventionsCount = 0;
  
  let currentLevel = 1;
  let soundMuted = false;
  let isUserActive = true;
  let lastActivityTimestamp = Date.now();
  
  let mainTimerInterval = null;
  let breakTimerInterval = null;
  let remainingBreakSeconds = 0;

  // Web Audio Context for Siren & Effects
  let audioCtx = null;
  let sirenOscillator = null;
  let sirenGain = null;
  let isSirenPlaying = false;

  // DOM Elements
  const toggleModeBtn = document.getElementById('toggleModeBtn');
  const modeText = document.getElementById('modeText');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundOnIcon = document.getElementById('soundOnIcon');
  const soundOffIcon = document.getElementById('soundOffIcon');
  const takeBreakBtn = document.getElementById('takeBreakBtn');
  const sirenOverlay = document.getElementById('sirenOverlay');

  const officerHalo = document.getElementById('officerHalo');
  const officerSpeech = document.getElementById('officerSpeech');
  const activityStatusBadge = document.getElementById('activityStatusBadge');

  const levelBadge = document.getElementById('levelBadge');
  const gaugeProgress = document.getElementById('gaugeProgress');
  const workMinutes = document.getElementById('workMinutes');
  const workSeconds = document.getElementById('workSeconds');
  const idleNotice = document.getElementById('idleNotice');
  const activityStateText = document.getElementById('activityStateText');
  const nextLevelCountdown = document.getElementById('nextLevelCountdown');

  const cardLevel1 = document.getElementById('cardLevel1');
  const cardLevel2 = document.getElementById('cardLevel2');
  const cardLevel3 = document.getElementById('cardLevel3');
  const cardLevel4 = document.getElementById('cardLevel4');

  const rangeL1 = document.getElementById('rangeL1');
  const rangeL2 = document.getElementById('rangeL2');
  const rangeL3 = document.getElementById('rangeL3');
  const rangeL4 = document.getElementById('rangeL4');

  const totalWorkTimeEl = document.getElementById('totalWorkTime');
  const breaksTakenCountEl = document.getElementById('breaksTakenCount');
  const interventionsCountEl = document.getElementById('interventionsCount');
  const healthScoreEl = document.getElementById('healthScore');

  // Modal Elements
  const officerInterventionModal = document.getElementById('officerInterventionModal');
  const modalWorkDuration = document.getElementById('modalWorkDuration');
  const modalBreakTimer = document.getElementById('modalBreakTimer');
  const completeBreakBtn = document.getElementById('completeBreakBtn');
  const completeBreakText = document.getElementById('completeBreakText');

  // ------------------------------------------------------------------
  // AUDIO SYNTHESIZER (Web Audio API)
  // ------------------------------------------------------------------
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
  }

  function startSiren() {
    if (soundMuted || isSirenPlaying) return;
    initAudio();
    if (!audioCtx) return;

    try {
      sirenOscillator = audioCtx.createOscillator();
      sirenGain = audioCtx.createGain();

      sirenOscillator.type = 'sawtooth';
      sirenGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

      // Frequency sweep (police siren)
      const now = audioCtx.currentTime;
      sirenOscillator.frequency.setValueAtTime(600, now);
      
      // Siren sweep interval using Web Audio LFO frequency
      let up = true;
      let freq = 600;
      const sirenSweep = setInterval(() => {
        if (!isSirenPlaying || soundMuted) {
          clearInterval(sirenSweep);
          return;
        }
        freq = up ? freq + 40 : freq - 40;
        if (freq >= 950) up = false;
        if (freq <= 550) up = true;
        if (sirenOscillator) {
          sirenOscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        }
      }, 50);

      sirenOscillator.connect(sirenGain);
      sirenGain.connect(audioCtx.destination);
      sirenOscillator.start();
      isSirenPlaying = true;
    } catch (e) {
      console.warn('Audio start siren error:', e);
    }
  }

  function stopSiren() {
    if (sirenOscillator) {
      try {
        sirenOscillator.stop();
        sirenOscillator.disconnect();
      } catch (e) {}
      sirenOscillator = null;
    }
    isSirenPlaying = false;
  }

  function playChime(freq = 880, duration = 0.2) {
    if (soundMuted) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  // ------------------------------------------------------------------
  // USER ACTIVITY TRACKER
  // ------------------------------------------------------------------
  const registerActivity = () => {
    lastActivityTimestamp = Date.now();
    if (!isUserActive) {
      isUserActive = true;
      updateActivityStatusUI();
    }
  };

  ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, registerActivity, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) registerActivity();
  });

  // ------------------------------------------------------------------
  // TIMER & EVALUATION ENGINE
  // ------------------------------------------------------------------
  function startMainEngine() {
    if (mainTimerInterval) clearInterval(mainTimerInterval);

    mainTimerInterval = setInterval(() => {
      // Check if user has gone idle
      const now = Date.now();
      const idleTimeSeconds = (now - lastActivityTimestamp) / 1000;

      if (idleTimeSeconds >= currentConfig.idleTimeout) {
        if (isUserActive) {
          isUserActive = false;
          updateActivityStatusUI();
        }
      }

      // Increment active work time only if user is active & modal not open
      if (isUserActive && officerInterventionModal.classList.contains('hidden')) {
        activeWorkSeconds++;
        totalWorkSecondsToday++;
      }

      evaluateLevel();
      updateReadoutUI();
      updateStatsUI();
    }, 1000);
  }

  function evaluateLevel() {
    let newLevel = 1;

    if (activeWorkSeconds >= currentConfig.l3Max) {
      newLevel = 4;
    } else if (activeWorkSeconds >= currentConfig.l2Max) {
      newLevel = 3;
    } else if (activeWorkSeconds >= currentConfig.l1Max) {
      newLevel = 2;
    } else {
      newLevel = 1;
    }

    if (newLevel !== currentLevel) {
      currentLevel = newLevel;
      onLevelChange(newLevel);
    }
  }

  function onLevelChange(level) {
    // Audio Feedback
    if (level === 2) {
      playChime(660, 0.3);
      stopSiren();
    } else if (level === 3) {
      playChime(900, 0.4);
      startSiren();
    } else if (level === 4) {
      stopSiren();
      startSiren();
      triggerOfficerIntervention();
    } else if (level === 1) {
      stopSiren();
      playChime(1200, 0.3);
    }

    updateLevelUI(level);
  }

  // ------------------------------------------------------------------
  // UI UPDATE FUNCTIONS
  // ------------------------------------------------------------------
  function updateActivityStatusUI() {
    if (isUserActive) {
      activityStatusBadge.textContent = 'Work Session Active';
      activityStatusBadge.className = 'status-chip active';
      idleNotice.classList.add('hidden');
      activityStateText.textContent = 'Active Input Detected';
      activityStateText.className = 'stat-value text-green';
    } else {
      activityStatusBadge.textContent = 'User Resting / Idle';
      activityStatusBadge.className = 'status-chip resting';
      idleNotice.classList.remove('hidden');
      activityStateText.textContent = 'Resting / Inactive';
      activityStateText.className = 'stat-value';
    }
  }

  function updateReadoutUI() {
    const mins = Math.floor(activeWorkSeconds / 60);
    const secs = activeWorkSeconds % 60;
    workMinutes.textContent = String(mins).padStart(2, '0');
    workSeconds.textContent = String(secs).padStart(2, '0');

    // Update SVG Progress Arc
    const circumference = 502; // 2 * PI * 80
    let progressRatio = 0;
    const maxThreshold = currentConfig.l3Max;
    progressRatio = Math.min(activeWorkSeconds / maxThreshold, 1.0);

    const strokeOffset = circumference - (progressRatio * circumference);
    gaugeProgress.style.strokeDashoffset = strokeOffset;

    // Stroke Color Class
    gaugeProgress.className = `gauge-progress level-${currentLevel}-stroke`;

    // Next Level Countdown Text
    let nextThreshold = currentConfig.l1Max;
    let nextLabel = 'Level 2';

    if (currentLevel === 1) {
      nextThreshold = currentConfig.l1Max;
      nextLabel = 'Level 2';
    } else if (currentLevel === 2) {
      nextThreshold = currentConfig.l2Max;
      nextLabel = 'Level 3 Siren';
    } else if (currentLevel === 3) {
      nextThreshold = currentConfig.l3Max;
      nextLabel = 'Level 4 Intervention';
    } else {
      nextLevelCountdown.textContent = 'MAX LEVEL 4 REACHED';
      return;
    }

    const secondsLeft = Math.max(0, nextThreshold - activeWorkSeconds);
    const cMins = Math.floor(secondsLeft / 60);
    const cSecs = secondsLeft % 60;
    nextLevelCountdown.textContent = `In ${String(cMins).padStart(2, '0')}:${String(cSecs).padStart(2, '0')} (${nextLabel})`;
  }

  function updateLevelUI(level) {
    // Level Badge Header
    const levelNames = {
      1: '🟢 LEVEL 1 — PRODUCTIVE',
      2: '🟡 LEVEL 2 — SUSPICIOUS',
      3: '🟠 LEVEL 3 — PROCRASTINATING ON BREAKS',
      4: '🔴 LEVEL 4 — OFFICER INTERVENTION'
    };
    levelBadge.textContent = levelNames[level];
    levelBadge.className = `level-badge level-${level}`;

    // Officer Halo & Speech
    officerHalo.className = `officer-halo level-${level}-glow`;

    const officerDialogues = {
      1: '"Officer on duty! Active work session in progress. You are pacing well and healthy!"',
      2: '"Officer Warning: You have been working continuously for a while now. Eye strain building up, wrap up soon!"',
      3: '"🚨 SIREN ALERT! Continuous overwork detected! You are resisting necessary rest. STEP AWAY NOW!"',
      4: '"👮‍♂️ MANDATORY OVERWORK INTERVENTION! Screen locked until break completion. Stand up and rest!"'
    };
    officerSpeech.textContent = officerDialogues[level];

    // Card Active States
    [cardLevel1, cardLevel2, cardLevel3, cardLevel4].forEach((card, idx) => {
      if (idx + 1 === level) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Siren Overlay
    if (level === 3 || level === 4) {
      sirenOverlay.classList.remove('hidden');
    } else {
      sirenOverlay.classList.add('hidden');
    }
  }

  function updateStatsUI() {
    const tMins = Math.floor(totalWorkSecondsToday / 60);
    const tSecs = totalWorkSecondsToday % 60;
    totalWorkTimeEl.textContent = `${String(tMins).padStart(2, '0')}:${String(tSecs).padStart(2, '0')}`;

    breaksTakenCountEl.textContent = breaksTaken;
    interventionsCountEl.textContent = interventionsCount;

    // Health Score calculation (Healthy work to break ratio)
    let score = 100 - (interventionsCount * 15) + (breaksTaken * 5);
    score = Math.max(10, Math.min(100, score));
    healthScoreEl.textContent = `${score}%`;
  }

  // ------------------------------------------------------------------
  // LEVEL 4 OFFICER INTERVENTION MODAL LOGIC
  // ------------------------------------------------------------------
  function triggerOfficerIntervention() {
    interventionsCount++;
    officerInterventionModal.classList.remove('hidden');

    const minsWorked = Math.floor(activeWorkSeconds / 60);
    modalWorkDuration.textContent = `${minsWorked} minute${minsWorked !== 1 ? 's' : ''}`;

    remainingBreakSeconds = currentConfig.breakDuration;
    completeBreakBtn.disabled = true;

    if (breakTimerInterval) clearInterval(breakTimerInterval);

    updateBreakModalTimerUI();

    breakTimerInterval = setInterval(() => {
      remainingBreakSeconds--;
      updateBreakModalTimerUI();

      if (remainingBreakSeconds <= 0) {
        clearInterval(breakTimerInterval);
        completeBreakBtn.disabled = false;
        completeBreakText.textContent = '✅ Break Complete! Resume Work';
        playChime(1000, 0.5);
      }
    }, 1000);
  }

  function updateBreakModalTimerUI() {
    const bMins = Math.floor(remainingBreakSeconds / 60);
    const bSecs = remainingBreakSeconds % 60;
    modalBreakTimer.textContent = `${String(bMins).padStart(2, '0')}:${String(bSecs).padStart(2, '0')}`;

    if (remainingBreakSeconds > 0) {
      completeBreakText.textContent = `Complete Break (Locked: ${String(bMins).padStart(2, '0')}:${String(bSecs).padStart(2, '0')})`;
    }
  }

  function completeBreak() {
    officerInterventionModal.classList.add('hidden');
    stopSiren();

    breaksTaken++;
    activeWorkSeconds = 0; // Reset continuous work timer
    currentLevel = 1;

    updateLevelUI(1);
    updateReadoutUI();
    updateStatsUI();
  }

  // ------------------------------------------------------------------
  // EVENT HANDLERS
  // ------------------------------------------------------------------
  // Manual Take a Break
  takeBreakBtn.addEventListener('click', () => {
    if (activeWorkSeconds > 10) {
      breaksTaken++;
      activeWorkSeconds = 0;
      currentLevel = 1;
      stopSiren();
      updateLevelUI(1);
      updateReadoutUI();
      updateStatsUI();
      playChime(1200, 0.4);
    }
  });

  // Modal Complete Break Button
  completeBreakBtn.addEventListener('click', () => {
    completeBreak();
  });

  // Toggle Mode (Demo vs Real)
  toggleModeBtn.addEventListener('click', () => {
    isDemoMode = !isDemoMode;
    currentConfig = isDemoMode ? THRESHOLDS.demo : THRESHOLDS.real;

    modeText.textContent = currentConfig.name;
    toggleModeBtn.querySelector('.dot').className = isDemoMode ? 'dot demo-active' : 'dot';

    // Update Matrix Descriptions
    rangeL1.textContent = currentConfig.labels.l1;
    rangeL2.textContent = currentConfig.labels.l2;
    rangeL3.textContent = currentConfig.labels.l3;
    rangeL4.textContent = currentConfig.labels.l4;

    // Reset continuous work for clean mode switch
    activeWorkSeconds = 0;
    currentLevel = 1;
    stopSiren();
    updateLevelUI(1);
    updateReadoutUI();
  });

  // Toggle Sound
  soundToggleBtn.addEventListener('click', () => {
    soundMuted = !soundMuted;
    if (soundMuted) {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
      stopSiren();
    } else {
      soundOffIcon.classList.add('hidden');
      soundOnIcon.classList.remove('hidden');
      if (currentLevel === 3 || currentLevel === 4) {
        startSiren();
      }
    }
  });

  // Initialize App
  startMainEngine();
  updateLevelUI(1);
  updateReadoutUI();
  updateStatsUI();
});
