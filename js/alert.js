var alertLastRadarId = null;
var alertLastStage = null;

function alertReset() {
  alertLastRadarId = null;
  alertLastStage = null;
}

function alertBeep() {
  var AudioContextClass;
  var context;
  var oscillator;
  var gain;

  AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    context = new AudioContextClass();
    oscillator = context.createOscillator();
    gain = context.createGain();

    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();

    setTimeout(function() {
      oscillator.stop();
      context.close();
    }, 180);
  } catch (e) {
  }
}

function alertVibrate() {
  if (navigator.vibrate) {
    navigator.vibrate([100, 80, 100]);
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
  var stage = null;

  if (distance <= 200) {
    stage = 200;
  } else if (distance <= 500) {
    stage = 500;
  } else if (distance <= 1000) {
    stage = 1000;
  }

  if (stage === null) {
    return;
  }

  if (alertLastRadarId === radar.id && alertLastStage === stage) {
    return;
  }

  alertLastRadarId = radar.id;
  alertLastStage = stage;

  alertBeep();
  alertVibrate();

  if (stage === 1000) {
    alertSpeak("Radar. Limite " + radar.speed + ". Um quilômetro.");
  } else {
    alertSpeak("Radar. Limite " + radar.speed + ". " + stage + " metros.");
  }
}
