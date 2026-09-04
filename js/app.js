var appCurrentRadarSpeedLimit = null;
var appCurrentSpeed = null;

function appInit() {
  appLoadVersion();
  alertInit();

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

  document.getElementById("btnUpdate").addEventListener("click", updateRadars);

  document.getElementById("btnSoundTest").addEventListener("click", alertTestSound);
  document.getElementById("btnVolumeUp").addEventListener("click", alertVolumeUp);
  document.getElementById("btnVolumeDown").addEventListener("click", alertVolumeDown);

  databaseLoadRadars(function(error, list) {
    if (error) {
      appSetMessage(error.message);
      return;
    }

    radarSetList(list);
    appUpdateDatabaseStatus(list.length);

    if (list.length === 0) {
      appLoadBundledDatabase();
    } else {
      appSetMessage("Pronto.");
    }
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("sw.js").then(function(registration) {
        registration.update();
      });
    });
  }
}

function appLoadBundledDatabase() {
  appSetMessage("Carregando base inicial...");

  fetch("data/radars.json")
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Base inicial indisponível");
      }
      return response.json();
    })
    .then(function(data) {
      if (!data || !Array.isArray(data.radars) || !data.radars.length) {
        throw new Error("Base inicial vazia");
      }

      databaseSaveRadars(data.radars, function(error) {
        if (error) {
          appSetMessage(error.message);
          return;
        }

        radarSetList(data.radars);
        appUpdateDatabaseStatus(data.radars.length);
        appSetMessage("Pronto.");
      });
    })
    .catch(function() {
      appSetMessage("Base vazia. Toque em ATUALIZAR RADARES.");
    });
}

function appSetMessage(text) {
  document.getElementById("message").textContent = text;
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

function appUpdateDatabaseStatus(count) {
  var updatedAt = localStorage.getItem("radarDatabaseUpdatedAt");
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
  document.getElementById("btnStart").disabled = false;
  document.getElementById("btnStart").textContent = "PARAR GPS";
  document.getElementById("gpsStatus").textContent = "GPS: ativo";
}

function appGpsStopped() {
  document.getElementById("btnStart").disabled = false;
  document.getElementById("btnStart").textContent = "INICIAR GPS";
  document.getElementById("gpsStatus").textContent = "GPS: parado";
  document.getElementById("speedValue").textContent = "--";
  appCurrentSpeed = null;
  appShowRadar(null);
}

function appUpdateSpeedColor() {
  var speedValue = document.getElementById("speedValue");

  if (typeof appCurrentSpeed === "number" &&
      appCurrentRadarSpeedLimit > 0 &&
      appCurrentSpeed > appCurrentRadarSpeedLimit) {
    speedValue.classList.add("overLimit");
  } else {
    speedValue.classList.remove("overLimit");
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
  var app = document.getElementById("app");
  var config;

  if (!result) {
    panel.className = "hidden";
    panel.style.backgroundColor = "";
    panel.style.color = "";
    panel.style.borderColor = "";
    app.className = "";
    appCurrentRadarSpeedLimit = null;
    appUpdateSpeedColor();
    return;
  }

  config = SPEED_CONFIG[Number(result.radar.speed)] || {
    color: "#ef5b00",
    text: "#ffffff"
  };

  panel.className = "";
  panel.style.backgroundColor = config.color;
  panel.style.color = config.text;
  panel.style.borderColor = config.text;

  appCurrentRadarSpeedLimit = Number(result.radar.speed) || null;
  appUpdateSpeedColor();
  document.getElementById("radarLimit").textContent =
    appCurrentRadarSpeedLimit ? appCurrentRadarSpeedLimit : "?";
  document.getElementById("radarDistance").textContent =
    Math.max(0, Math.round(result.distance)) + " m";
  document.getElementById("radarRoad").textContent = "";
  document.getElementById("radarInfo").textContent = "Radar";

  app.className = "warning";
}


document.addEventListener("DOMContentLoaded", appInit);
