var alertRadarId = null;
var alertVoiceDone = false;
var alertBeepTimer = null;
var alertAudioContext = null;
var alertVoiceAudio = null;
var alertVoiceAudioUnlocked = false;
var alertVolume = 0.8;

var ALERT_VOICE_DISTANCE = 500;
var ALERT_BEEP_DISTANCE = 200;
var ALERT_BEEP_INTERVAL = 1000;
var ALERT_BEEP_FREQUENCY = 700;
var ALERT_BEEP_DURATION = 150;
var ALERT_VOLUME_STEP = 0.2;
var ALERT_VOLUME_STORAGE_KEY = "radarAlertVolume";

var SPEED_CONFIG = {
  30:  { color: "#d00000", text: "#ffffff", audio: "audio/30.mp3"  },
  40:  { color: "#d00000", text: "#ffffff", audio: "audio/40.mp3"  },
  60:  { color: "#e23b00", text: "#ffffff", audio: "audio/60.mp3"  },
  80:  { color: "#ef5b00", text: "#ffffff", audio: "audio/80.mp3"  },
  90:  { color: "#f47b00", text: "#ffffff", audio: "audio/90.mp3"  },
  100: { color: "#f6a400", text: "#ffffff", audio: "audio/100.mp3" },
  110: { color: "#f8c21a", text: "#111111", audio: "audio/110.mp3" },
  120: { color: "#f9d423", text: "#111111", audio: "audio/120.mp3" }
};

var ALERT_TYPE_NAMES = {
  1: "Radar fixo",
  2: "Semáforo com radar",
  4: "Radar de trecho",
  5: "Radar móvel"
};

function alertInit() {
  var stored = Number(localStorage.getItem(ALERT_VOLUME_STORAGE_KEY));

  if (stored >= 0.2 && stored <= 1) {
    alertVolume = stored;
  }

  alertVoiceAudio = new Audio();
  alertVoiceAudio.preload = "auto";
  alertVoiceAudio.volume = alertVolume;
}

function alertPrepareAudio() {
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (AudioContextClass) {
    try {
      if (!alertAudioContext) {
        alertAudioContext = new AudioContextClass();
      }

      if (alertAudioContext.state === "suspended" && alertAudioContext.resume) {
        alertAudioContext.resume();
      }
    } catch (e) {
    }
  }

  alertUnlockVoiceAudio();
}

function alertUnlockVoiceAudio() {
  var config;
  var playPromise;

  if (!alertVoiceAudio || alertVoiceAudioUnlocked) {
    return;
  }

  config = SPEED_CONFIG[60];

  try {
    alertVoiceAudio.src = config.audio;
    alertVoiceAudio.muted = true;
    alertVoiceAudio.currentTime = 0;
    playPromise = alertVoiceAudio.play();

    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(function() {
        alertVoiceAudio.pause();
        alertVoiceAudio.currentTime = 0;
        alertVoiceAudio.muted = false;
        alertVoiceAudioUnlocked = true;
      }).catch(function() {
        alertVoiceAudio.muted = false;
      });
    } else {
      alertVoiceAudio.pause();
      alertVoiceAudio.currentTime = 0;
      alertVoiceAudio.muted = false;
      alertVoiceAudioUnlocked = true;
    }
  } catch (e) {
    alertVoiceAudio.muted = false;
  }
}

function alertReset() {
  alertStopBeeping();
  alertRadarId = null;
  alertVoiceDone = false;
}

function alertBeep() {
  var oscillator;
  var gain;
  var now;
  var beepGain;

  alertPrepareAudio();

  if (!alertAudioContext) {
    return;
  }

  try {
    now = alertAudioContext.currentTime;
    oscillator = alertAudioContext.createOscillator();
    gain = alertAudioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(ALERT_BEEP_FREQUENCY, now);

    // Keep the tone moderate while allowing five useful app-volume levels.
    beepGain = 0.025 + (alertVolume * 0.12);
    gain.gain.setValueAtTime(beepGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + ALERT_BEEP_DURATION / 1000);

    oscillator.connect(gain);
    gain.connect(alertAudioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + ALERT_BEEP_DURATION / 1000);
  } catch (e) {
  }
}

function alertStartBeeping() {
  if (alertBeepTimer !== null) {
    return;
  }

  alertBeep();
  alertBeepTimer = setInterval(alertBeep, ALERT_BEEP_INTERVAL);
}

function alertStopBeeping() {
  if (alertBeepTimer !== null) {
    clearInterval(alertBeepTimer);
    alertBeepTimer = null;
  }
}

function alertSpeak(text) {
  var utterance;

  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    return;
  }

  try {
    speechSynthesis.cancel();
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1.05;
    utterance.volume = alertVolume;
    speechSynthesis.speak(utterance);
  } catch (e) {
  }
}

function alertPlaySpeedAudio(speed) {
  var config = SPEED_CONFIG[Number(speed)];
  var playPromise;

  if (!config || !alertVoiceAudio) {
    return false;
  }

  try {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }

    alertVoiceAudio.pause();
    alertVoiceAudio.src = config.audio;
    alertVoiceAudio.currentTime = 0;
    alertVoiceAudio.muted = false;
    alertVoiceAudio.volume = alertVolume;
    playPromise = alertVoiceAudio.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function() {
      });
    }

    return true;
  } catch (e) {
    return false;
  }
}

function alertSetVolume(value) {
  alertVolume = Math.max(0.2, Math.min(1, value));
  alertVolume = Math.round(alertVolume * 10) / 10;
  localStorage.setItem(ALERT_VOLUME_STORAGE_KEY, String(alertVolume));

  if (alertVoiceAudio) {
    alertVoiceAudio.volume = alertVolume;
  }

  alertBeep();
}

function alertVolumeUp() {
  alertSetVolume(alertVolume + ALERT_VOLUME_STEP);
}

function alertVolumeDown() {
  alertSetVolume(alertVolume - ALERT_VOLUME_STEP);
}

function alertTestSound() {
  alertPrepareAudio();
  alertPlaySpeedAudio(60);

  window.setTimeout(alertBeep, 1000);
  window.setTimeout(alertBeep, 2000);
  window.setTimeout(alertBeep, 3000);
}

function alertRadar(radar, distance) {
  var typeName;

  if (alertRadarId !== radar.id) {
    alertReset();
    alertRadarId = radar.id;
  }

  if (distance <= ALERT_VOICE_DISTANCE && !alertVoiceDone) {
    if (!alertPlaySpeedAudio(radar.speed)) {
      typeName = "Radar";
      alertSpeak(typeName + ". Limite " + radar.speed + ".");
    }

    alertVoiceDone = true;
  }

  if (distance <= ALERT_BEEP_DISTANCE) {
    alertStartBeeping();
  }
}
