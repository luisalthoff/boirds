var appCurrentRadarSpeedLimit = null;
var appCurrentSpeed = null;
var appWakeLock = null;

var SPEEDOMETER_MAX_KMH = 220;
var SPEEDOMETER_BLUE = "#38bdf8";
var SPEEDOMETER_RED = "#ff3b30";
var SPEEDOMETER_BLACK = "#0b0b0b";
var SPEEDOMETER_WHITE = "#ffffff";

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

function speedometerColorFor(kmh) {
  if (typeof appCurrentRadarSpeedLimit === "number" &&
      kmh > appCurrentRadarSpeedLimit) {
    return SPEEDOMETER_RED;
  }

  return SPEEDOMETER_BLUE;
}

function speedometerDraw() {
  var canvas = document.getElementById("speedometerCanvas");
  var ctx;
  var centerX;
  var centerY;
  var radius;
  var startAngle;
  var endAngle;
  var totalAngle;
  var totalTicks;
  var i;
  var kmh;
  var angle;
  var isMajor;
  var tickLength;
  var innerR;
  var outerR;
  var color;
  var textRadius;
  var x;
  var y;
  var shownSpeed;
  var needleSpeed;
  var needleAngle;
  var needleLength;
  var tailLength;

  if (!canvas) {
    return;
  }

  ctx = canvas.getContext("2d");
  centerX = canvas.width / 2;
  centerY = canvas.height / 2;
  radius = 385;
  startAngle = Math.PI * 0.75;
  endAngle = Math.PI * 2.25;
  totalAngle = endAngle - startAngle;
  totalTicks = SPEEDOMETER_MAX_KMH / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = SPEEDOMETER_BLACK;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tick marks: blue normally. When a radar is active, only the part above
  // the actual limit becomes red.
  for (i = 0; i <= totalTicks; i++) {
    kmh = i * 2;
    angle = startAngle + (kmh / SPEEDOMETER_MAX_KMH) * totalAngle;
    isMajor = i % 5 === 0;
    tickLength = isMajor ? 34 : 17;
    outerR = radius;
    innerR = radius - tickLength;
    color = speedometerColorFor(kmh);

    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(angle) * innerR,
      centerY + Math.sin(angle) * innerR
    );
    ctx.lineTo(
      centerX + Math.cos(angle) * outerR,
      centerY + Math.sin(angle) * outerR
    );
    ctx.lineWidth = isMajor ? 6 : 3;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isMajor ? 10 : 4;
    ctx.stroke();
  }

  // Analog speed numbers.
  ctx.font = '700 44px Arial, Helvetica, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  textRadius = radius - 78;

  for (kmh = 0; kmh <= SPEEDOMETER_MAX_KMH; kmh += 20) {
    angle = startAngle + (kmh / SPEEDOMETER_MAX_KMH) * totalAngle;
    color = speedometerColorFor(kmh);
    x = centerX + Math.cos(angle) * textRadius;
    y = centerY + Math.sin(angle) * textRadius;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 9;
    ctx.fillText(String(kmh), x, y);
  }

  // Unit label in the center.
  ctx.shadowBlur = 0;
  ctx.font = '700 32px Arial, Helvetica, sans-serif';
  ctx.fillStyle = SPEEDOMETER_WHITE;
  ctx.fillText("km/h", centerX, centerY - 92);

  // Needle. It always uses the exact same red as the speed-limit sign.
  needleSpeed = typeof appCurrentSpeed === "number"
    ? Math.max(0, Math.min(appCurrentSpeed, SPEEDOMETER_MAX_KMH))
    : 0;
  needleAngle = startAngle + (needleSpeed / SPEEDOMETER_MAX_KMH) * totalAngle;
  needleLength = radius - 54;
  tailLength = 42;

  ctx.beginPath();
  ctx.moveTo(
    centerX - Math.cos(needleAngle) * tailLength,
    centerY - Math.sin(needleAngle) * tailLength
  );
  ctx.lineTo(
    centerX + Math.cos(needleAngle) * needleLength,
    centerY + Math.sin(needleAngle) * needleLength
  );
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.strokeStyle = SPEEDOMETER_RED;
  ctx.shadowColor = SPEEDOMETER_RED;
  ctx.shadowBlur = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
  ctx.fillStyle = SPEEDOMETER_RED;
  ctx.shadowColor = SPEEDOMETER_RED;
  ctx.shadowBlur = 8;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 11, 0, Math.PI * 2);
  ctx.fillStyle = SPEEDOMETER_BLACK;
  ctx.shadowBlur = 0;
  ctx.fill();

  // Large digital speed. It remains blue; the analog scale itself shows the
  // radar threshold in red, so the driver's current speed is always easy to identify.
  shownSpeed = typeof appCurrentSpeed === "number"
    ? String(Math.round(appCurrentSpeed))
    : "--";

  ctx.font = '900 158px "Courier New", Courier, monospace';
  ctx.fillStyle = SPEEDOMETER_BLUE;
  ctx.shadowColor = SPEEDOMETER_BLUE;
  ctx.shadowBlur = 10;
  ctx.fillText(shownSpeed, centerX, centerY + 235);
  ctx.shadowBlur = 0;
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

  try {
    speedometerDraw();
  } catch (error) {
    console.error("Speedometer startup failed:", error);
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
      gpsRestart();
    });
  }

  button = document.getElementById("btnStart");
  if (button) {
    button.addEventListener("click", function() {
      appHideGpsPermissionHelp();
      gpsRestart();
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

  if ("serviceWorker" in navigator &&
      location.hostname !== "localhost" &&
      location.hostname !== "127.0.0.1") {
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

function appSetSpeedometerVisible(visible) {
  var panel = document.getElementById("speedPanel");

  if (!panel) {
    return;
  }

  panel.className = visible ? "" : "hidden";
}

function appGpsStarted() {
  var button = document.getElementById("btnStart");

  document.getElementById("gpsStatus").textContent = "GPS: ativo";

  if (button) {
    button.className = "compactButton gpsButton active hidden";
  }
}

function appGpsStopped() {
  var button = document.getElementById("btnStart");

  document.getElementById("gpsStatus").textContent = "GPS: parado";

  if (button) {
    button.className = "compactButton gpsButton active";
  }
  appCurrentSpeed = null;
  appShowRadar(null);
  appSetSpeedometerVisible(false);
}

function appGpsUpdate(position) {
  appCurrentSpeed = typeof position.speed === "number" ? position.speed : null;
  appSetSpeedometerVisible(true);
  speedometerDraw();

  document.getElementById("gpsStatus").textContent =
    "GPS: ±" + Math.round(position.accuracy) + " m";
}

function appShowRadar(result) {
  var radarPanel = document.getElementById("radarPanel");
  var limitPanel = document.getElementById("limitPanel");

  if (!result) {
    radarPanel.className = "hidden";
    limitPanel.className = "hidden";
    appCurrentRadarSpeedLimit = null;
    speedometerDraw();
    return;
  }

  radarPanel.className = "";
  limitPanel.className = "";
  appCurrentRadarSpeedLimit = Number(result.radar.speed) || null;

  document.getElementById("radarLimit").textContent =
    appCurrentRadarSpeedLimit ? appCurrentRadarSpeedLimit : "?";
  document.getElementById("radarDistanceValue").textContent =
    Math.max(0, Math.round(result.distance));

  speedometerDraw();
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
