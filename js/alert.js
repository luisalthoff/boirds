var alertRadarId = null;
var alertVoiceDone = false;
var alertBeepTimer = null;
var alertAudioContext = null;

var ALERT_VOICE_DISTANCE = 500;
var ALERT_BEEP_DISTANCE = 200;
var ALERT_BEEP_INTERVAL = 1000;
var ALERT_BEEP_FREQUENCY = 700;
var ALERT_BEEP_DURATION = 150;

var ALERT_TYPE_NAMES = {
  1: "Radar fixo",
  2: "Semáforo com radar",
  4: "Radar de trecho",
  5: "Radar móvel"
};

function alertPrepareAudio() {
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

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

function alertReset() {
  alertStopBeeping();
  alertRadarId = null;
  alertVoiceDone = false;
}

function alertBeep() {
  var oscillator;
  var gain;
  var now;

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
    gain.gain.setValueAtTime(0.08, now);
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
    speechSynthesis.speak(utterance);
  } catch (e) {
  }
}

function alertRadar(radar, distance) {
  var typeName;

  if (alertRadarId !== radar.id) {
    alertReset();
    alertRadarId = radar.id;
  }

  if (distance <= ALERT_VOICE_DISTANCE && !alertVoiceDone) {
    typeName = ALERT_TYPE_NAMES[radar.type] || "Radar";
    alertSpeak(typeName + ". Limite " + radar.speed + ".");
    alertVoiceDone = true;
  }

  if (distance <= ALERT_BEEP_DISTANCE) {
    alertStartBeeping();
  }
}
