var radarList = [];
var radarActive = null;
var radarPreviousDistance = {};

var RADAR_MAX_DISTANCE = 1500;
var RADAR_MAX_DIRECTION_ERROR = 65;

function radarSetList(list) {
  radarList = list || [];
  radarActive = null;
  radarPreviousDistance = {};
}

function radarIsApproaching(radar, distance) {
  var previous = radarPreviousDistance[radar.id];

  radarPreviousDistance[radar.id] = distance;

  if (typeof previous !== "number") {
    return true;
  }

  return distance <= previous + 8;
}

function radarMatchesDirection(position, radar, bearingToRadar) {
  var heading = position.heading;

  if (typeof heading !== "number" || isNaN(heading) || heading < 0) {
    return true;
  }

  if (helperAngleDifference(heading, bearingToRadar) > RADAR_MAX_DIRECTION_ERROR) {
    return false;
  }

  if (typeof radar.heading === "number" &&
      !isNaN(radar.heading) &&
      helperAngleDifference(heading, radar.heading) > RADAR_MAX_DIRECTION_ERROR) {
    return false;
  }

  return true;
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

function radarCheck(position) {
  var result = radarFindNearest(position);

  if (!result) {
    radarActive = null;
    appShowRadar(null);
    return;
  }

  radarActive = result.radar;
  appShowRadar(result);
  alertRadar(result.radar, result.distance);
}
