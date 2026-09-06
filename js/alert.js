var alertRadarObject = null;
var alertVoiceDone = false;
var alertBeepStarted = false;
var alertBeepTimer = null;
var alertAudioContext = null;
var alertVolume = 0.8;

var ALERT_VOICE_SECONDS = 20;
var ALERT_BEEP_SECONDS = 10;
var ALERT_FALLBACK_VOICE_DISTANCE = 500;
var ALERT_FALLBACK_BEEP_DISTANCE = 250;
var ALERT_BEEP_INTERVAL = 1000;
var ALERT_BEEP_FREQUENCY = 700;
var ALERT_BEEP_DURATION = 150;
var ALERT_VOLUME_STEP = 0.2;
var ALERT_VOLUME_STORAGE_KEY = "radarAlertVolume";

function alertDistanceForSeconds(speedKmh, seconds, fallback) {
  speedKmh = Number(speedKmh);

  if (!isNaN(speedKmh) && speedKmh > 0) {
    return (speedKmh / 3.6) * seconds;
  }

  return fallback;
}

function alertVoiceDistanceForCarSpeed(speedKmh) {
  return alertDistanceForSeconds(
    speedKmh,
    ALERT_VOICE_SECONDS,
    ALERT_FALLBACK_VOICE_DISTANCE
  );
}

function alertBeepDistanceForCarSpeed(speedKmh) {
  return alertDistanceForSeconds(
    speedKmh,
    ALERT_BEEP_SECONDS,
    ALERT_FALLBACK_BEEP_DISTANCE
  );
}

function alertInit() {
  var stored = Number(localStorage.getItem(ALERT_VOLUME_STORAGE_KEY));

  if (stored >= 0.2 && stored <= 1) {
    alertVolume = stored;
  }
}

function alertPrepareAudio() {
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  var resumePromise;

  if (!AudioContextClass) {
    return;
  }

  try {
    if (!alertAudioContext) {
      alertAudioContext = new AudioContextClass();
    }

    if (alertAudioContext.state === "suspended" && alertAudioContext.resume) {
      resumePromise = alertAudioContext.resume();

      if (resumePromise && typeof resumePromise.catch === "function") {
        resumePromise.catch(function() {});
      }
    }
  } catch (e) {
  }
}

function alertReset() {
  alertStopBeeping();
  alertRadarObject = null;
  alertVoiceDone = false;
  alertBeepStarted = false;
}

function alertBeep() {
  var oscillator;
  var gain;
  var now;
  var beepGain;

  if (!alertAudioContext || alertAudioContext.state !== "running") {
    return;
  }

  try {
    now = alertAudioContext.currentTime;
    oscillator = alertAudioContext.createOscillator();
    gain = alertAudioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(ALERT_BEEP_FREQUENCY, now);
    beepGain = 0.025 + (alertVolume * 0.12);
    gain.gain.setValueAtTime(beepGain, now);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + ALERT_BEEP_DURATION / 1000
    );

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

  alertPrepareAudio();
  alertBeepStarted = true;
  alertBeep();
  alertBeepTimer = setInterval(alertBeep, ALERT_BEEP_INTERVAL);
}

function alertStopBeeping() {
  if (alertBeepTimer !== null) {
    clearInterval(alertBeepTimer);
    alertBeepTimer = null;
  }
}

function alertSpeakSpeed(speed) {
  var utterance;
  var numericSpeed = Number(speed);
  var text = numericSpeed > 0
    ? "Radar. Limit" + numericSpeed + "."
    : "Radar.";

  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    return;
  }

  try {
    speechSynthesis.cancel();
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-UK";
    utterance.rate = 1.0;
    utterance.volume = alertVolume;
    speechSynthesis.speak(utterance);
  } catch (e) {
  }
}

function alertSetVolume(value) {
  alertVolume = Math.max(0.2, Math.min(1, value));
  alertVolume = Math.round(alertVolume * 10) / 10;
  localStorage.setItem(ALERT_VOLUME_STORAGE_KEY, String(alertVolume));
  alertPrepareAudio();
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
  alertSpeakSpeed(60);
  window.setTimeout(alertBeep, 1300);
  window.setTimeout(alertBeep, 2300);
}

function alertRadar(radar, distance, carSpeed) {
  var speed = Number(radar.speed) || 0;
  var beepDistance;

  if (alertRadarObject !== radar) {
    alertReset();
    alertRadarObject = radar;
  }

  if (!alertVoiceDone) {
    alertSpeakSpeed(speed);
    alertVoiceDone = true;
  }

  if (!alertBeepStarted) {
    beepDistance = alertBeepDistanceForCarSpeed(carSpeed);

    if (distance <= beepDistance) {
      alertStartBeeping();
    }
  }
}
