var appCurrentRadarSpeedLimit = null;
var appCurrentSpeed = null;
var appWakeLock = null;

async function appWakeLockEnable() {
  if (!("wakeLock" in navigator)) {
    console.log("Wake Lock not supported");
    return;
  }

  if (appWakeLock !== null) {
    return;
  }

  try {
    appWakeLock = await navigator.wakeLock.request("screen");

    appWakeLock.addEventListener("release", function() {
      appWakeLock = null;
      console.log("Wake Lock released");
    });

    console.log("Wake Lock enabled");
  } catch (error) {
    appWakeLock = null;
    console.log("Wake Lock error:", error);
  }
}

function appInit() {
  var button;

  // Start the two core functions first and independently. An optional UI/audio
  // problem must never prevent the radar base or GPS from starting.
  try {
    appLoadRadars();
  } catch (error) {
    console.error("Radar database startup failed:", error);
  }

  try {
    gpsStart();
  } catch (error) {
    console.error("GPS startup failed:", error);
  }

  // Everything below is secondary to the core radar/GPS startup.
  try {
    appLoadVersion();
  } catch (error) {
    console.error("Version startup failed:", error);
  }

  try {
    appWakeLockEnable();
  } catch (error) {
    console.error("Wake Lock startup failed:", error);
  }

  try {
    alertInit();
  } catch (error) {
    console.error("Audio startup failed:", error);
  }

  button = document.getElementById("btnGpsRetry");
  if (button) {
    button.addEventListener("click", function() {
      appHideGpsPermissionHelp();
      gpsStart();
    });
  }

  button = document.getElementById("btnSoundTest");
  if (button) {
    button.addEventListener("click", alertTestSound);
  }

  button = document.getElementById("btnVolumeUp");
  if (button) {
    button.addEventListener("click", alertVolumeUp);
  }

  button = document.getElementById("btnVolumeDown");
  if (button) {
    button.addEventListener("click", alertVolumeDown);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("sw.js").then(function(registration) {
        registration.update();
      }).catch(function(error) {
        console.error("Service Worker registration failed:", error);
      });
    });
  }
}

function appLoadRadars() {
  fetch("data/radars.json")
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Base de radares indisponível");
      }

      return response.json();
    })
    .then(function(data) {
      if (!data || !Array.isArray(data.radars) || !data.radars.length) {
        throw new Error("Base de radares vazia");
      }

      radarSetList(data.radars);
      appUpdateRadarStatus(data.radars.length, data.updatedAt);
    })
    .catch(function(error) {
      console.error("Radar database load failed:", error);
      radarSetList([]);
      appUpdateRadarStatus(0, "");
      appSetMessage("Base de radares indisponível.");
    });
}

function appSetMessage(text) {
  document.getElementById("message").textContent = text || "";
}

function appLoadVersion() {
  fetch("version.json", { cache: "no-store" })
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Version unavailable");
      }

      return response.json();
    })
    .then(function(data) {
      appSetVersion(data.version, data.build);
    })
    .catch(function() {
      appSetVersion("--", "");
    });
}

function appSetVersion(version, build) {
  var element = document.getElementById("appVersion");
  var text = "v" + version;

  if (!element) {
    return;
  }

  if (build) {
    text += " • " + build;
  }

  element.textContent = text;
}

function appUpdateRadarStatus(count, updatedAt) {
  var text = "Base: " + count + " radares";

  if (updatedAt) {
    text += " • " + helperFormatDateTime(updatedAt);
  }

  document.getElementById("dbStatus").textContent = text;
}

function appShowGpsPermissionHelp() {
  document.getElementById("gpsPermissionPanel").className = "";
}

function appHideGpsPermissionHelp() {
  document.getElementById("gpsPermissionPanel").className = "hidden";
}

function appGpsStarted() {
  document.getElementById("gpsStatus").textContent = "GPS: ativo";
}

function appGpsStopped() {
  document.getElementById("gpsStatus").textContent = "GPS: parado";
  document.getElementById("speedValue").textContent = "--";
  appCurrentSpeed = null;
  appShowRadar(null);
}

function appUpdateSpeedColor() {
  var speedValue = document.getElementById("speedValue");

  speedValue.classList.remove("safeSpeed");
  speedValue.classList.remove("overLimit");

  if (typeof appCurrentSpeed !== "number" || !appCurrentRadarSpeedLimit) {
    return;
  }

  if (appCurrentSpeed > appCurrentRadarSpeedLimit) {
    speedValue.classList.add("overLimit");
  } else {
    speedValue.classList.add("safeSpeed");
  }
}

function appGpsUpdate(position) {
  var speedText = "--";
  var speedValue = document.getElementById("speedValue");

  if (typeof position.speed === "number") {
    speedText = Math.round(position.speed);
  }

  speedValue.textContent = speedText;
  appCurrentSpeed = typeof position.speed === "number" ? position.speed : null;
  appUpdateSpeedColor();

  document.getElementById("gpsStatus").textContent =
    "GPS: ±" + Math.round(position.accuracy) + " m";
}

function appShowRadar(result) {
  var panel = document.getElementById("radarPanel");

  if (!result) {
    panel.className = "hidden";
    appCurrentRadarSpeedLimit = null;
    appUpdateSpeedColor();
    return;
  }

  panel.className = "";
  appCurrentRadarSpeedLimit = Number(result.radar.speed) || null;
  appUpdateSpeedColor();

  document.getElementById("radarLimit").textContent =
    appCurrentRadarSpeedLimit ? appCurrentRadarSpeedLimit : "?";
  document.getElementById("radarDistanceValue").textContent =
    Math.max(0, Math.round(result.distance));
}

document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "visible") {
    appWakeLockEnable();
  }
});

document.addEventListener("click", function() {
  appWakeLockEnable();
  alertPrepareAudio();
}, { once: true });

document.addEventListener("DOMContentLoaded", appInit);
