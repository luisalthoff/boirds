var alertRadarObject = null;
var alertVoiceDone = false;
var alertBeepStarted = false;
var alertBeepTimer = null;
var alertAudioContext = null;
var alertVoiceAudio = null;
var alertVoiceBuffers = {};
var alertVoiceLoadStarted = false;
var alertVoiceSource = null;
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

function alertLoadVoiceBuffers() {
  var speeds;

  if (alertVoiceLoadStarted || !alertAudioContext) {
    return;
  }

  alertVoiceLoadStarted = true;
  speeds = Object.keys(SPEED_CONFIG);

  speeds.forEach(function(speed) {
    var config = SPEED_CONFIG[speed];

    fetch(config.audio, { cache: "force-cache" })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("Audio unavailable");
        }

        return response.arrayBuffer();
      })
      .then(function(arrayBuffer) {
        return new Promise(function(resolve, reject) {
          var settled = false;
          var result;

          function done(buffer) {
            if (!settled) {
              settled = true;
              resolve(buffer);
            }
          }

          function failed(error) {
            if (!settled) {
              settled = true;
              reject(error);
            }
          }

          try {
            result = alertAudioContext.decodeAudioData(
              arrayBuffer.slice(0),
              done,
              failed
            );

            if (result && typeof result.then === "function") {
              result.then(done).catch(failed);
            }
          } catch (error) {
            failed(error);
          }
        });
      })
      .then(function(buffer) {
        alertVoiceBuffers[Number(speed)] = buffer;
      })
      .catch(function() {
        // HTMLAudio/TTS remain available as fallbacks.
      });
  });
}

function alertInit() {
  var stored = Number(localStorage.getItem(ALERT_VOLUME_STORAGE_KEY));

  if (stored >= 0.2 && stored <= 1) {
    alertVolume = stored;
  }

  alertVoiceAudio = new Audio();
  alertVoiceAudio.preload = "auto";
  alertVoiceAudio.volume = alertVolume;
}

function alertUnlockWebAudio() {
  var oscillator;
  var gain;
  var now;

  if (!alertAudioContext || alertAudioContext.state !== "running") {
    return;
  }

  try {
    now = alertAudioContext.currentTime;
    oscillator = alertAudioContext.createOscillator();
    gain = alertAudioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    oscillator.connect(gain);
    gain.connect(alertAudioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.02);
  } catch (e) {
  }
}

function alertPrepareAudio() {
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  var resumePromise;

  if (AudioContextClass) {
    try {
      if (!alertAudioContext) {
        alertAudioContext = new AudioContextClass();
      }

      if (alertAudioContext.state === "suspended" && alertAudioContext.resume) {
        resumePromise = alertAudioContext.resume();

        if (resumePromise && typeof resumePromise.then === "function") {
          resumePromise.then(alertUnlockWebAudio).catch(function() {});
        }
      } else {
        alertUnlockWebAudio();
      }
    } catch (e) {
    }
  }

  alertLoadVoiceBuffers();
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

function alertPlaySpeedAudio(speed, fallbackText) {
  var numericSpeed = Number(speed);
  var config = SPEED_CONFIG[numericSpeed];
  var buffer = alertVoiceBuffers[numericSpeed];
  var source;
  var gain;
  var playPromise;

  if (!config) {
    return false;
  }

  // Preferred iPhone/PWA path: decoded Web Audio buffer, prepared by a user tap.
  if (alertAudioContext && alertAudioContext.state === "running" && buffer) {
    try {
      if (alertVoiceSource) {
        try {
          alertVoiceSource.stop();
        } catch (e) {
        }
      }

      source = alertAudioContext.createBufferSource();
      gain = alertAudioContext.createGain();
      source.buffer = buffer;
      gain.gain.value = alertVolume;
      source.connect(gain);
      gain.connect(alertAudioContext.destination);
      source.start(0);
      alertVoiceSource = source;

      source.onended = function() {
        if (alertVoiceSource === source) {
          alertVoiceSource = null;
        }
      };

      return true;
    } catch (e) {
    }
  }

  // Fallback while the Web Audio buffer is still loading.
  if (!alertVoiceAudio) {
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
        if (fallbackText) {
          alertSpeak(fallbackText);
        }
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
  alertPrepareAudio();
  alertSetVolume(alertVolume + ALERT_VOLUME_STEP);
}

function alertVolumeDown() {
  alertPrepareAudio();
  alertSetVolume(alertVolume - ALERT_VOLUME_STEP);
}

function alertTestSound() {
  alertPrepareAudio();

  // Give decoded buffers a moment to finish. If not ready, HTMLAudio is used.
  window.setTimeout(function() {
    if (!alertPlaySpeedAudio(60, "Radar. Limite 60.")) {
      alertSpeak("Radar. Limite 60.");
    }
  }, 150);

  window.setTimeout(alertBeep, 1300);
  window.setTimeout(alertBeep, 2300);
}

function alertRadar(radar, distance, carSpeed, hasPassed) {
  var speed = Number(radar.speed) || 0;
  var fallbackText = speed > 0
    ? "Radar. Limite " + speed + "."
    : "Radar.";
  var beepDistance;

  if (alertRadarObject !== radar) {
    alertReset();
    alertRadarObject = radar;
  }

  if (!alertVoiceDone) {
    if (!alertPlaySpeedAudio(speed, fallbackText)) {
      alertSpeak(fallbackText);
    }

    alertVoiceDone = true;
  }

  // Before the radar, beeping begins at current speed (m/s) x 10 seconds.
  // Once started, it never stops until the radar is released at +200 m.
  if (!alertBeepStarted) {
    beepDistance = alertBeepDistanceForCarSpeed(carSpeed);

    if (hasPassed || distance <= beepDistance) {
      alertStartBeeping();
    }
  }
}
