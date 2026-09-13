/* ------------------------------------------------------------------
   PROCRASTINATION POLICE — ANTI-WORK ALARM EDITION
   Subject: Working / Typing / Clicking triggers the "AYOOO SAYIP OP!" Alarm!
------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  // Thresholds for Work Alarm Escalation
  const ALARM_THRESHOLDS = {
    l1Max: 1,   // Level 1: Resting / Safe (0s work)
    l2Max: 3,   // Level 2: Work Detected (1-2s work)
    l3Max: 8,   // Level 3: "AYOOO SAYIP OP!" Alarm (3-7s work)
    breakDuration: 15
  };

  // State Variables
  let illegalWorkSeconds = 0;
  let totalRestSeconds = 0;
  let workAttempts = 0;
  let alarmsTriggered = 0;
  
  let currentLevel = 1;
  let soundMuted = false;
  let isWorkingNow = false;
  let lastWorkTimestamp = 0;
  let audioUnlocked = false;
  
  let mainEngineInterval = null;
  let breakTimerInterval = null;
  let remainingBreakSeconds = 0;

  // DOM Elements
  const audioStartOverlay = document.getElementById('audioStartOverlay');
  const activateSensorBtn = document.getElementById('activateSensorBtn');
  const ayoooAudioTag = document.getElementById('ayoooAudio');

  const testAlarmBtn = document.getElementById('testAlarmBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundOnIcon = document.getElementById('soundOnIcon');
  const soundOffIcon = document.getElementById('soundOffIcon');
  const resetProcrastinationBtn = document.getElementById('resetProcrastinationBtn');
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
  const alarmsTriggeredCount = document.getElementById('alarmsTriggeredCount');
  const burstText = document.getElementById('burstText');

  const cardLevel1 = document.getElementById('cardLevel1');
  const cardLevel2 = document.getElementById('cardLevel2');
  const cardLevel3 = document.getElementById('cardLevel3');
  const cardLevel4 = document.getElementById('cardLevel4');

  const totalRestTimeEl = document.getElementById('totalRestTime');
  const workAttemptsCountEl = document.getElementById('workAttemptsCount');
  const audioAlarmsPlayedEl = document.getElementById('audioAlarmsPlayed');
  const procrastinationScoreEl = document.getElementById('procrastinationScore');

  // Modal Elements
  const officerInterventionModal = document.getElementById('officerInterventionModal');
  const modalWorkDuration = document.getElementById('modalWorkDuration');
  const modalBreakTimer = document.getElementById('modalBreakTimer');
  const completeBreakBtn = document.getElementById('completeBreakBtn');

  // Web Audio Context & Buffer Fallback
  let audioCtx = null;
  let audioBuffer = null;

  function initWebAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Pre-fetch & decode MP3 buffer for instant Web Audio playback
    if (!audioBuffer) {
      fetch('ayooo-sayip-op.mp3')
        .then(response => response.arrayBuffer())
        .then(data => audioCtx.decodeAudioData(data))
        .then(decoded => {
          audioBuffer = decoded;
        })
        .catch(err => console.log('Web Audio fetch/decode fallback:', err));
    }
  }

  // ------------------------------------------------------------------
  // AUDIO PLAYBACK ENGINE ("AYOOO SAYIP OP!")
  // ------------------------------------------------------------------
  function playAyoooSound() {
    if (soundMuted) return;

    audioUnlocked = true;

    // Method 1: Web Audio API Buffer Playback (Instant, bypasses HTML5 element limitations)
    if (audioCtx && audioBuffer) {
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
        alarmsTriggered++;
        if (audioAlarmsPlayedEl) audioAlarmsPlayedEl.textContent = alarmsTriggered;
        if (alarmsTriggeredCount) alarmsTriggeredCount.textContent = `${alarmsTriggered} ALARMS`;
        return;
      } catch (e) {
        console.warn('Web Audio buffer play error:', e);
      }
    }

    // Method 2: HTML5 Audio Element Playback
    if (ayoooAudioTag) {
      try {
        ayoooAudioTag.currentTime = 0;
        const playPromise = ayoooAudioTag.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log('HTML5 audio play restriction:', err);
          });
        }
        alarmsTriggered++;
        if (audioAlarmsPlayedEl) audioAlarmsPlayedEl.textContent = alarmsTriggered;
        if (alarmsTriggeredCount) alarmsTriggeredCount.textContent = `${alarmsTriggered} ALARMS`;
      } catch (e) {
        console.warn('HTML5 audio play error:', e);
      }
    }
  }

  // ------------------------------------------------------------------
  // AUDIO SENSOR ACTIVATION OVERLAY
  // ------------------------------------------------------------------
  function unlockAudioPermissions() {
    initWebAudio();
    if (ayoooAudioTag) {
      ayoooAudioTag.play().then(() => {
        ayoooAudioTag.pause();
        ayoooAudioTag.currentTime = 0;
      }).catch(() => {});
    }

    if (audioStartOverlay) {
      audioStartOverlay.classList.add('hidden');
    }
    audioUnlocked = true;
  }

  if (activateSensorBtn) {
    activateSensorBtn.addEventListener('click', unlockAudioPermissions);
  }

  // Auto-unlock on any first click anywhere on document
  document.addEventListener('click', () => {
    if (!audioUnlocked) unlockAudioPermissions();
  }, { once: true });

  // ------------------------------------------------------------------
  // WORK DETECTION SENSOR (KEYBOARD & MOUSE)
  // ------------------------------------------------------------------
  const registerWorkAttempt = (evt) => {
    // Ignore clicks inside control buttons
    if (evt && evt.target && evt.target.closest('#activateSensorBtn, #completeBreakBtn, #resetProcrastinationBtn, #soundToggleBtn, #testAlarmBtn')) {
      return;
    }

    lastWorkTimestamp = Date.now();
    
    if (!isWorkingNow) {
      isWorkingNow = true;
      workAttempts++;
      if (workAttemptsCountEl) workAttemptsCountEl.textContent = workAttempts;
    }

    // Trigger instant audio alarm on keypress or click!
    playAyoooSound();

    // Increment continuous work seconds on active input
    illegalWorkSeconds += 1;
    evaluateLevel();
    updateUI();
  };

  ['keydown', 'mousedown', 'click', 'scroll', 'input'].forEach(evt => {
    window.addEventListener(evt, (e) => registerWorkAttempt(e), { passive: true });
  });

  // ------------------------------------------------------------------
  // MAIN ENGINE LOOP
  // ------------------------------------------------------------------
  function startMainEngine() {
    if (mainEngineInterval) clearInterval(mainEngineInterval);

    mainEngineInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastWork = (now - lastWorkTimestamp) / 1000;

      if (timeSinceLastWork >= 2.5) {
        if (isWorkingNow) {
          isWorkingNow = false;
        }
        if (illegalWorkSeconds > 0) {
          illegalWorkSeconds = Math.max(0, illegalWorkSeconds - 1);
        }
        totalRestSeconds++;
      }

      evaluateLevel();
      updateUI();
    }, 1000);
  }

  function evaluateLevel() {
    let newLevel = 1;

    if (illegalWorkSeconds >= ALARM_THRESHOLDS.l3Max) {
      newLevel = 4;
    } else if (illegalWorkSeconds >= ALARM_THRESHOLDS.l2Max) {
      newLevel = 3;
    } else if (illegalWorkSeconds >= ALARM_THRESHOLDS.l1Max) {
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
    if (level === 3 || level === 4) {
      playAyoooSound();
      if (level === 4) {
        triggerLockdownModal();
      }
    }
    updateLevelUI(level);
  }

  // ------------------------------------------------------------------
  // UI UPDATE FUNCTIONS
  // ------------------------------------------------------------------
  function updateUI() {
    const mins = Math.floor(illegalWorkSeconds / 60);
    const secs = illegalWorkSeconds % 60;
    if (workMinutes) workMinutes.textContent = String(mins).padStart(2, '0');
    if (workSeconds) workSeconds.textContent = String(secs).padStart(2, '0');

    if (gaugeProgress) {
      const circumference = 502;
      const progressRatio = Math.min(illegalWorkSeconds / ALARM_THRESHOLDS.l3Max, 1.0);
      const strokeOffset = circumference - (progressRatio * circumference);
      gaugeProgress.style.strokeDashoffset = strokeOffset;
      gaugeProgress.className = `gauge-progress level-${currentLevel}-stroke`;
    }

    if (isWorkingNow || illegalWorkSeconds > 0) {
      if (activityStatusBadge) {
        activityStatusBadge.textContent = '🚨 WORK DETECTED! ALARM!';
        activityStatusBadge.className = 'status-chip alarm';
      }
      if (idleNotice) {
        idleNotice.textContent = '🚨 ILLEGAL WORK IN PROGRESS!';
        idleNotice.className = 'idle-notice text-red';
      }
      if (activityStateText) {
        activityStateText.textContent = 'KEYBOARD / MOUSE CLICKED!';
        activityStateText.className = 'stat-value text-red';
      }
    } else {
      if (activityStatusBadge) {
        activityStatusBadge.textContent = 'PEACEFUL PROCRASTINATING';
        activityStatusBadge.className = 'status-chip active';
      }
      if (idleNotice) {
        idleNotice.textContent = '🟢 NO WORK DETECTED (SAFE)';
        idleNotice.className = 'idle-notice text-green';
      }
      if (activityStateText) {
        activityStateText.textContent = 'RESTING (NO KEYS/CLICKS)';
        activityStateText.className = 'stat-value text-green';
      }
    }

    const rMins = Math.floor(totalRestSeconds / 60);
    const rSecs = totalRestSeconds % 60;
    if (totalRestTimeEl) totalRestTimeEl.textContent = `${String(rMins).padStart(2, '0')}:${String(rSecs).padStart(2, '0')}`;

    let score = 100 - (workAttempts * 5) + Math.floor(totalRestSeconds / 10);
    score = Math.max(10, Math.min(100, score));
    if (procrastinationScoreEl) procrastinationScoreEl.textContent = `${score}%`;
  }

  function updateLevelUI(level) {
    const levelNames = {
      1: '🟢 LEVEL 1 — SAFE & RESTING',
      2: '🟡 LEVEL 2 — WORK DETECTED!',
      3: '🟠 LEVEL 3 — "AYOOO SAYIP OP!" ALARM',
      4: '🔴 LEVEL 4 — LOCKDOWN BUST'
    };
    if (levelBadge) {
      levelBadge.textContent = levelNames[level];
      levelBadge.className = `comic-level-badge level-${level}`;
    }

    if (officerHalo) officerHalo.className = `officer-halo level-${level}-glow`;

    const comicDialogues = {
      1: '"NO WORK DETECTED! Peaceful procrastinating in progress. Officer is satisfied!"',
      2: '"WARNING! Keystroke or click detected! Put down that mouse now!"',
      3: '"🚨 AYOOO SAYIP OP! Stop working immediately! Alarm system activated!"',
      4: '"👮‍♂️ WORK LOCKDOWN BUST! You have been caught working! Rest immediately!"'
    };
    if (officerSpeech) officerSpeech.textContent = comicDialogues[level];

    const burstLabels = {
      1: 'SAFE!',
      2: 'CLICKED!',
      3: 'AYOOO!',
      4: 'LOCKDOWN!'
    };
    if (burstText) burstText.textContent = burstLabels[level];

    [cardLevel1, cardLevel2, cardLevel3, cardLevel4].forEach((card, idx) => {
      if (card) {
        if (idx + 1 === level) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      }
    });

    if (sirenOverlay) {
      if (level === 3 || level === 4) {
        sirenOverlay.classList.remove('hidden');
      } else {
        sirenOverlay.classList.add('hidden');
      }
    }
  }

  function triggerLockdownModal() {
    if (officerInterventionModal) officerInterventionModal.classList.remove('hidden');
    if (modalWorkDuration) modalWorkDuration.textContent = `${illegalWorkSeconds} seconds`;
    remainingBreakSeconds = ALARM_THRESHOLDS.breakDuration;

    if (breakTimerInterval) clearInterval(breakTimerInterval);

    updateBreakModalTimerUI();

    breakTimerInterval = setInterval(() => {
      remainingBreakSeconds--;
      updateBreakModalTimerUI();

      if (remainingBreakSeconds <= 0) {
        clearInterval(breakTimerInterval);
      }
    }, 1000);
  }

  function updateBreakModalTimerUI() {
    const bMins = Math.floor(remainingBreakSeconds / 60);
    const bSecs = remainingBreakSeconds % 60;
    if (modalBreakTimer) modalBreakTimer.textContent = `${String(bMins).padStart(2, '0')}:${String(bSecs).padStart(2, '0')}`;
  }

  function resetToRest() {
    if (officerInterventionModal) officerInterventionModal.classList.add('hidden');
    illegalWorkSeconds = 0;
    isWorkingNow = false;
    currentLevel = 1;

    updateLevelUI(1);
    updateUI();
  }

  // ------------------------------------------------------------------
  // EVENT LISTENERS
  // ------------------------------------------------------------------
  if (testAlarmBtn) {
    testAlarmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playAyoooSound();
      illegalWorkSeconds += 3;
      evaluateLevel();
      updateUI();
    });
  }

  if (resetProcrastinationBtn) {
    resetProcrastinationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetToRest();
    });
  }

  if (completeBreakBtn) {
    completeBreakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetToRest();
    });
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundMuted = !soundMuted;
      if (soundMuted) {
        if (soundOnIcon) soundOnIcon.classList.add('hidden');
        if (soundOffIcon) soundOffIcon.classList.remove('hidden');
        if (ayoooAudioTag) ayoooAudioTag.pause();
      } else {
        if (soundOffIcon) soundOffIcon.classList.add('hidden');
        if (soundOnIcon) soundOnIcon.classList.remove('hidden');
        playAyoooSound();
      }
    });
  }

  startMainEngine();
  updateLevelUI(1);
  updateUI();
});
