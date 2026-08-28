var gpsWatchId = null;
var gpsPermissionRequesting = false;
var gpsPreviousPosition = null;

var GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000
};

var GPS_MIN_MOVEMENT_FOR_HEADING = 3;
var GPS_MAX_SAMPLE_AGE = 10;

function gpsStart() {
  if (!navigator.geolocation) {
    appSetMessage("Geolocalização não disponível neste aparelho.");
    return;
  }

  if (gpsWatchId !== null || gpsPermissionRequesting) {
    return;
  }

  gpsPreviousPosition = null;
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

  gpsPreviousPosition = null;
  appGpsStopped();
}

function gpsPositionUpdate(position) {
  var coords = position.coords;
  var timestamp = position.timestamp || Date.now();
  var speedKmh = null;
  var heading = null;
  var distanceMoved;
  var elapsedSeconds;
  var calculatedSpeed;
  var normalized;

  if (gpsPreviousPosition) {
    distanceMoved = helperDistanceMeters(
      gpsPreviousPosition.latitude,
      gpsPreviousPosition.longitude,
      coords.latitude,
      coords.longitude
    );

    elapsedSeconds = (timestamp - gpsPreviousPosition.timestamp) / 1000;

    if (elapsedSeconds > 0 && elapsedSeconds <= GPS_MAX_SAMPLE_AGE) {
      calculatedSpeed = (distanceMoved / elapsedSeconds) * 3.6;

      if (calculatedSpeed >= 0 && calculatedSpeed < 250) {
        speedKmh = calculatedSpeed;
      }
    }

    if (distanceMoved >= GPS_MIN_MOVEMENT_FOR_HEADING) {
      heading = helperBearingDegrees(
        gpsPreviousPosition.latitude,
        gpsPreviousPosition.longitude,
        coords.latitude,
        coords.longitude
      );
    }
  }

  if (speedKmh === null && typeof coords.speed === "number" && coords.speed >= 0) {
    speedKmh = coords.speed * 3.6;
  }

  if (heading === null && typeof coords.heading === "number" && coords.heading >= 0) {
    heading = coords.heading;
  }

  normalized = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    speed: speedKmh,
    heading: heading
  };

  gpsPreviousPosition = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: timestamp
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

  gpsPreviousPosition = null;
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
