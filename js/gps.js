var gpsWatchId = null;
var gpsPermissionRequesting = false;

var GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000
};

function gpsStart() {
  if (!navigator.geolocation) {
    appSetMessage("Geolocalização não disponível neste aparelho.");
    return;
  }

  if (gpsWatchId !== null || gpsPermissionRequesting) {
    return;
  }

  gpsPermissionRequesting = true;

  navigator.geolocation.getCurrentPosition(
    gpsPermissionGranted,
    gpsError,
    GPS_OPTIONS
  );
}

function gpsPermissionGranted(position) {
  gpsPermissionRequesting = false;
  appHideGpsPermissionHelp();
  gpsPositionUpdate(position);

  try {
    gpsWatchId = navigator.geolocation.watchPosition(
      gpsPositionUpdate,
      gpsError,
      GPS_OPTIONS
    );

    appGpsStarted();
  } catch (error) {
    gpsWatchId = null;
    appGpsStopped();
    appSetMessage("Não foi possível iniciar o GPS contínuo.");
  }
}

function gpsStop() {
  gpsPermissionRequesting = false;

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

  gpsPermissionRequesting = false;

  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }

  appGpsStopped();

  if (error && error.code === 1) {
    message = "Permissão de localização negada pelo iPhone.";
    appShowGpsPermissionHelp();
  } else if (error && error.code === 2) {
    message = "Localização indisponível.";
  } else if (error && error.code === 3) {
    message = "Tempo esgotado ao obter localização.";
  }

  appSetMessage(message);
}
