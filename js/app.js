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
  appLoadVersion();
  appWakeLockEnable();

  document.getElementById("btnStart").addEventListener("click", function() {
    alertPrepareAudio();

    if (gpsWatchId === null && !gpsPermissionRequesting) {
      gpsStart();
    } else if (gpsWatchId !== null) {
      gpsStop();
    }
  });

  document.getElementById("btnGpsRetry").addEventListener("click", function() {
    appHideGpsPermissionHelp();
    gpsStart();
  });

  document.getElementById("btnSoundTest").addEventListener("click", alertTestSound);
  document.getElementById("btnVolumeUp").addEventListener("click", alertVolumeUp);
  document.getElementById("btnVolumeDown").addEventListener("click", alertVolumeDown);

  appLoadRadars();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("sw.js").then(function(registration) {
        registration.update();
      });
    });
  }
}

function appLoadRadars() {
  fetch("data/radars.json")
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Base de radares indisponível1");
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
      appSetMessage("Base de radares indisponível2.");
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
  var button = document.getElementById("btnStart");

  button.disabled = false;
  button.textContent = "GPS ON";
  button.classList.add("active");
  document.getElementById("gpsStatus").textContent = "GPS: ativo";
}

function appGpsStopped() {
  var button = document.getElementById("btnStart");

  button.disabled = false;
  button.textContent = "GPS";
  button.classList.remove("active");
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
}, { once: true });

document.addEventListener("DOMContentLoaded", appInit);
