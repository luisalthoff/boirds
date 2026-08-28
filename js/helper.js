function helperToRadians(value) {
  return value * Math.PI / 180;
}

function helperToDegrees(value) {
  return value * 180 / Math.PI;
}

function helperNormalizeAngle(value) {
  value = value % 360;

  if (value < 0) {
    value += 360;
  }

  return value;
}

function helperAngleDifference(a, b) {
  var diff = Math.abs(helperNormalizeAngle(a) - helperNormalizeAngle(b));

  if (diff > 180) {
    diff = 360 - diff;
  }

  return diff;
}

function helperDistanceMeters(lat1, lon1, lat2, lon2) {
  var earthRadius = 6371000;
  var dLat = helperToRadians(lat2 - lat1);
  var dLon = helperToRadians(lon2 - lon1);

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(helperToRadians(lat1)) *
    Math.cos(helperToRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function helperBearingDegrees(lat1, lon1, lat2, lon2) {
  var p1 = helperToRadians(lat1);
  var p2 = helperToRadians(lat2);
  var dLon = helperToRadians(lon2 - lon1);

  var y = Math.sin(dLon) * Math.cos(p2);
  var x =
    Math.cos(p1) * Math.sin(p2) -
    Math.sin(p1) * Math.cos(p2) * Math.cos(dLon);

  return helperNormalizeAngle(helperToDegrees(Math.atan2(y, x)));
}

function helperFormatDateTime(value) {
  var d = new Date(value);

  if (isNaN(d.getTime())) {
    return "--";
  }

  return d.toLocaleDateString("pt-BR") + " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
