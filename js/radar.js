var radarList = [];
var radarActive = null;
var radarPassed = {};
var radarBehindCount = 0;

var RADAR_TRACK_DISTANCE = 600;
var RADAR_WARNING_DISTANCE = 500;
var RADAR_RELEASE_DISTANCE = 700;
var RADAR_MAX_DIRECTION_ERROR = 65;
var RADAR_BEHIND_ANGLE = 90;
var RADAR_BEHIND_CONFIRMATIONS = 2;

function radarSetList(list) {
  radarList = list || [];
  radarActive = null;
  radarPassed = {};
  radarBehindCount = 0;
  alertReset();
}

function radarSourceDirectionMatches(heading, radar) {
  // MapaRadar directionMode:
  // 0 = all directions -> always applicable
  // 1 = single direction -> compare GPS heading with stored direction
  // 2 = dual direction -> always applicable for Radar BR
  if (radar.directionMode === 0 || radar.directionMode === 2) {
    return true;
  }

  if (typeof radar.direction !== "number" || isNaN(radar.direction)) {
    return true;
  }

  return helperAngleDifference(heading, radar.direction) <= RADAR_MAX_DIRECTION_ERROR;
}

function radarMatchesDirection(position, radar, bearingToRadar) {
  var heading = position.heading;

  if (typeof heading !== "number" || isNaN(heading) || heading < 0) {
    return true;
  }

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
  var id;
  var radar;
  var distance;

  for (id in radarPassed) {
    if (!Object.prototype.hasOwnProperty.call(radarPassed, id)) {
      continue;
    }

    radar = radarPassed[id];
    distance = helperDistanceMeters(
      position.latitude,
      position.longitude,
      radar.lat,
      radar.lon
    );

    if (distance > RADAR_RELEASE_DISTANCE) {
      delete radarPassed[id];
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

    if (radarPassed[radar.id]) {
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
    radarPassed[radarActive.id] = radarActive;
  }

  radarActive = null;
  radarBehindCount = 0;
  alertReset();
  appShowRadar(null);
}

function radarHandleActive(position) {
  var result;

  if (!radarActive) {
    return false;
  }

  result = radarResultFor(position, radarActive);

  if (radarIsBehind(position, result)) {
    radarBehindCount++;

    if (radarBehindCount >= RADAR_BEHIND_CONFIRMATIONS) {
      radarClear(true);
      return false;
    }
  } else {
    radarBehindCount = 0;
  }

  if (result.distance > RADAR_RELEASE_DISTANCE) {
    radarClear(false);
    return false;
  }

  if (result.distance <= RADAR_WARNING_DISTANCE) {
    appShowRadar(result);
    alertRadar(result.radar, result.distance);
  } else {
    appShowRadar(null);
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
  radarBehindCount = 0;

  if (result.distance <= RADAR_WARNING_DISTANCE) {
    appShowRadar(result);
    alertRadar(result.radar, result.distance);
  } else {
    appShowRadar(null);
  }
}
