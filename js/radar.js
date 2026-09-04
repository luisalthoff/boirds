var radarList = [];
var radarActive = null;
var radarPassed = [];
var radarClosestDistance = Infinity;
var radarHasPassed = false;
var radarWarningStarted = false;

var RADAR_TRACK_DISTANCE = 1200;
var RADAR_REARM_DISTANCE = 1000;
var RADAR_POST_DISTANCE = 200;
var RADAR_MAX_DIRECTION_ERROR = 65;
var RADAR_BEHIND_ANGLE = 90;
var RADAR_PASS_ARM_DISTANCE = 250;
var RADAR_PASS_DISTANCE_INCREASE = 20;

function radarSetList(list) {
  radarList = list || [];
  radarActive = null;
  radarPassed = [];
  radarClosestDistance = Infinity;
  radarHasPassed = false;
  radarWarningStarted = false;
  alertReset();
}

function radarCarDirection(heading) {
  if (typeof heading !== "number" || isNaN(heading) || heading < 0) {
    return 0;
  }

  heading = ((heading % 360) + 360) % 360;

  // Same one-time conversion used by the database builder:
  // southward half of the compass = +1, northward half = -1.
  // Exact 270 degrees is assigned to +1; exact 90 degrees to -1.
  if ((heading > 90 && heading < 270) || heading === 270) {
    return 1;
  }

  return -1;
}

function radarSourceDirectionMatches(heading, radar) {
  var detection = Number(radar.detection);
  var direction = Number(radar.direction);
  var carDirection;

  // 0 = all directions, 2 = dual direction.
  if (detection === 0 || detection === 2) {
    return true;
  }

  // Unknown/missing metadata is treated conservatively as applicable.
  if (detection !== 1 || (direction !== -1 && direction !== 1)) {
    return true;
  }

  carDirection = radarCarDirection(heading);

  if (carDirection === 0) {
    return true;
  }

  return carDirection === direction;
}

function radarMatchesDirection(position, radar, bearingToRadar) {
  var heading = position.heading;

  if (typeof heading !== "number" || isNaN(heading) || heading < 0) {
    return true;
  }

  // The radar must still be ahead of the car. The source direction itself is
  // now a simple -1/0/+1 comparison and no longer uses an azimuth at runtime.
  if (helperAngleDifference(heading, bearingToRadar) > RADAR_MAX_DIRECTION_ERROR) {
    return false;
  }

  return radarSourceDirectionMatches(heading, radar);
}

function radarResultFor(position, radar) {
  var distance = helperDistanceMeters(
    position.latitude,
    position.longitude,
    radar.lat,
    radar.lon
  );

  return {
    radar: radar,
    distance: distance,
    bearing: helperBearingDegrees(
      position.latitude,
      position.longitude,
      radar.lat,
      radar.lon
    )
  };
}

function radarIsBehind(position, result) {
  if (typeof position.heading !== "number" ||
      isNaN(position.heading) ||
      position.heading < 0) {
    return false;
  }

  return helperAngleDifference(position.heading, result.bearing) > RADAR_BEHIND_ANGLE;
}

function radarUpdatePassedState(position) {
  var i;
  var radar;
  var distance;

  for (i = radarPassed.length - 1; i >= 0; i--) {
    radar = radarPassed[i];
    distance = helperDistanceMeters(
      position.latitude,
      position.longitude,
      radar.lat,
      radar.lon
    );

    if (distance > RADAR_REARM_DISTANCE) {
      radarPassed.splice(i, 1);
    }
  }
}

function radarFindNearest(position) {
  var best = null;
  var i;
  var radar;
  var result;

  for (i = 0; i < radarList.length; i++) {
    radar = radarList[i];

    if (radarPassed.indexOf(radar) !== -1) {
      continue;
    }

    result = radarResultFor(position, radar);

    if (result.distance > RADAR_TRACK_DISTANCE) {
      continue;
    }

    if (!radarMatchesDirection(position, radar, result.bearing)) {
      continue;
    }

    if (!best || result.distance < best.distance) {
      best = result;
    }
  }

  return best;
}

function radarClear(markPassed) {
  if (markPassed && radarActive) {
    radarPassed.push(radarActive);
  }

  radarActive = null;
  radarClosestDistance = Infinity;
  radarHasPassed = false;
  radarWarningStarted = false;
  alertReset();
  appShowRadar(null);
}

function radarPassDetected(position, result) {
  if (radarClosestDistance > RADAR_PASS_ARM_DISTANCE) {
    return false;
  }

  if (radarIsBehind(position, result)) {
    return true;
  }

  return result.distance >= radarClosestDistance + RADAR_PASS_DISTANCE_INCREASE;
}

function radarHandleActive(position) {
  var result;
  var voiceDistance;

  if (!radarActive) {
    return false;
  }

  result = radarResultFor(position, radarActive);

  if (result.distance < radarClosestDistance) {
    radarClosestDistance = result.distance;
  }

  if (!radarHasPassed && radarPassDetected(position, result)) {
    radarHasPassed = true;
    radarWarningStarted = true;
  }

  // After passing the MapaRadar reference point, keep the warning box,
  // red/white speed rule and beeping alive through +200 m.
  if (radarHasPassed) {
    if (result.distance >= RADAR_POST_DISTANCE) {
      radarClear(true);
      return false;
    }

    appShowRadar(result);
    alertRadar(result.radar, result.distance, position.speed, true);
    return true;
  }

  // Voice distance is dynamic: current car speed (m/s) x 20 seconds.
  // Once the voice zone is entered, the visual warning stays active until
  // the radar is fully released after +200 m.
  if (!radarWarningStarted) {
    voiceDistance = alertVoiceDistanceForCarSpeed(position.speed);

    if (result.distance <= voiceDistance) {
      radarWarningStarted = true;
    }
  }

  if (radarWarningStarted) {
    appShowRadar(result);
    alertRadar(result.radar, result.distance, position.speed, false);
  } else {
    appShowRadar(null);
  }

  // If the active radar was never recognized as passed and the car moves far
  // away from it (for example after leaving the road), abandon the candidate.
  if (result.distance > RADAR_TRACK_DISTANCE) {
    radarClear(false);
    return false;
  }

  return true;
}

function radarCheck(position) {
  var result;

  radarUpdatePassedState(position);

  if (radarHandleActive(position)) {
    return;
  }

  result = radarFindNearest(position);

  if (!result) {
    appShowRadar(null);
    return;
  }

  radarActive = result.radar;
  radarClosestDistance = result.distance;
  radarHasPassed = false;
  radarWarningStarted = false;

  radarHandleActive(position);
}
