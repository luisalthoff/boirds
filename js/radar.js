var radarList = [];
var radarActive = null;
var radarPreviousDistance = {};

var RADAR_MAX_DISTANCE = 600;
var RADAR_MAX_DIRECTION_ERROR = 65;
var RADAR_BEHIND_ANGLE = 90;

function radarSetList(list) {
  radarList = list || [];
  radarActive = null;
  radarPreviousDistance = {};
  alertReset();
}

function radarIsApproaching(radar, distance) {
  var previous = radarPreviousDistance[radar.id];

  radarPreviousDistance[radar.id] = distance;

  if (typeof previous !== "number") {
    return true;
  }

  return distance <= previous + 3;
}

function radarSourceDirectionMatches(heading, radar) {
  var opposite;

  if (radar.all || typeof radar.direction !== "number" || isNaN(radar.direction)) {
    return true;
  }

  if (helperAngleDifference(heading, radar.direction) <= RADAR_MAX_DIRECTION_ERROR) {
    return true;
  }

  if (radar.dual) {
    opposite = helperNormalizeAngle(radar.direction + 180);
    return helperAngleDifference(heading, opposite) <= RADAR_MAX_DIRECTION_ERROR;
  }

  return false;
}

function radarMatchesDirection(position, radar, bearingToRadar) {
  var heading = position.heading;

  if (typeof heading !== "number" || isNaN(heading) || heading < 0) {
    return true;
  }

  // The radar must still be in front of the vehicle.
  if (helperAngleDifference(heading, bearingToRadar) > RADAR_MAX_DIRECTION_ERROR) {
    return false;
  }

  return radarSourceDirectionMatches(heading, radar);
}

function radarActiveIsBehind(position) {
  var bearingToRadar;

  if (!radarActive ||
      typeof position.heading !== "number" ||
      isNaN(position.heading) ||
      position.heading < 0) {
    return false;
  }

  bearingToRadar = helperBearingDegrees(
    position.latitude,
    position.longitude,
    radarActive.lat,
    radarActive.lon
  );

  return helperAngleDifference(position.heading, bearingToRadar) > RADAR_BEHIND_ANGLE;
}

function radarFindNearest(position) {
  var best = null;
  var i;
  var radar;
  var distance;
  var bearing;

  for (i = 0; i < radarList.length; i++) {
    radar = radarList[i];

    distance = helperDistanceMeters(
      position.latitude,
      position.longitude,
      radar.lat,
      radar.lon
    );

    if (distance > RADAR_MAX_DISTANCE) {
      continue;
    }

    bearing = helperBearingDegrees(
      position.latitude,
      position.longitude,
      radar.lat,
      radar.lon
    );

    if (!radarMatchesDirection(position, radar, bearing)) {
      continue;
    }

    if (!radarIsApproaching(radar, distance)) {
      continue;
    }

    if (!best || distance < best.distance) {
      best = {
        radar: radar,
        distance: distance,
        bearing: bearing
      };
    }
  }

  return best;
}

function radarClear() {
  radarActive = null;
  alertReset();
  appShowRadar(null);
}

function radarCheck(position) {
  var result;

  if (radarActiveIsBehind(position)) {
    radarClear();
  }

  result = radarFindNearest(position);

  if (!result) {
    radarClear();
    return;
  }

  radarActive = result.radar;
  appShowRadar(result);
  alertRadar(result.radar, result.distance);
}
