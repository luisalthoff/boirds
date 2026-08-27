var gpsWatchId = null;

function gpsStart() {
  if (!navigator.geolocation) {
    appSetMessage("Geolocalização não disponível neste aparelho.");
    return;
  }

  if (gpsWatchId !== null) {
    return;
  }

  appSetMessage("Solicitando acesso ao GPS...");

  gpsWatchId = navigator.geolocation.watchPosition(
    gpsPositionUpdate,
    gpsError,
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000
    }
  );

  appGpsStarted();
}

function gpsStop() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }

  appGpsStopped();
}

function gpsPositionUpdate(position) {
  var coords = position.coords;
  var speedKmh = null;
  var normalized;

  if (typeof coords.speed === "number" && coords.speed >= 0) {
    speedKmh = coords.speed * 3.6;
  }

  normalized = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    speed: speedKmh,
    heading: coords.heading
  };

  appGpsUpdate(normalized);
  radarCheck(normalized);
}

function gpsError(error) {
  var message = "Erro no GPS.";

  if (error && error.code === 1) {
    message = "Permissão de localização negada.";
  } else if (error && error.code === 2) {
    message = "Localização indisponível.";
  } else if (error && error.code === 3) {
    message = "Tempo esgotado ao obter localização.";
  }

  appSetMessage(message);
}
