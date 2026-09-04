var UPDATE_API = "https://api.maparadar.com/poi";
var UPDATE_LIMIT = 10000;
var UPDATE_TYPES = "1,2,4,5";

var UPDATE_BOUNDS = {
  north: 6,
  south: -34,
  east: -34.5,
  west: -74.2
};

function updateDetection(poi) {
  if (poi.allDirections) {
    return 0;
  }

  if (poi.isDualDirection) {
    return 2;
  }

  return 1;
}

function updateDirection(azimuth, detection) {
  var direction;

  if (detection === 0 || detection === 2) {
    return 0;
  }

  direction = helperNormalizeAngle(Number(azimuth) || 0);

  // Southward half = +1; northward half = -1.
  // Boundary convention retained from the validated builder:
  // 90° -> -1 and 270° -> +1.
  if ((direction > 90 && direction < 270) || direction === 270) {
    return 1;
  }

  return -1;
}

function updateCompactPoi(poi) {
  var detection = updateDetection(poi);

  return {
    lat: Number(poi.latitude),
    lon: Number(poi.longitude),
    speed: Number(poi.speed),
    detection: detection,
    direction: updateDirection(poi.direction, detection)
  };
}

function updatePoiIsValid(poi) {
  return poi &&
    !poi.isDeleted &&
    Number(poi.speed) >= 30 &&
    Number.isFinite(Number(poi.latitude)) &&
    Number.isFinite(Number(poi.longitude));
}

function updateFetchPage(offset) {
  var params = new URLSearchParams({
    limit: String(UPDATE_LIMIT),
    offset: String(offset),
    showNormal: "true",
    showInvalidLocation: "false",
    showNoDirectionDual: "false",
    showNoDirectionSingle: "false",
    showDeleted: "false",
    north: String(UPDATE_BOUNDS.north),
    south: String(UPDATE_BOUNDS.south),
    east: String(UPDATE_BOUNDS.east),
    west: String(UPDATE_BOUNDS.west),
    types: UPDATE_TYPES
  });

  return fetch(UPDATE_API + "?" + params.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json, text/plain, */*" }
  }).then(function(response) {
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    return response.json();
  });
}

function updateDownloadAll(onProgress) {
  var radars = [];
  var offset = 0;

  function nextPage() {
    return updateFetchPage(offset).then(function(data) {
      var pois = data && Array.isArray(data.pois) ? data.pois : [];
      var i;

      for (i = 0; i < pois.length; i++) {
        if (updatePoiIsValid(pois[i])) {
          radars.push(updateCompactPoi(pois[i]));
        }
      }

      offset += pois.length;
      onProgress(offset, radars.length);

      if (pois.length === UPDATE_LIMIT) {
        return nextPage();
      }

      return radars;
    });
  }

  return nextPage();
}

function updateRadars() {
  var button = document.getElementById("btnUpdate");

  if (!window.fetch) {
    appSetMessage("Este navegador não suporta atualização online.");
    return;
  }

  alertPrepareAudio();
  button.disabled = true;
  button.textContent = "ATUALIZANDO...";
  appSetMessage("Baixando radares do MapaRadar...");

  updateDownloadAll(function(downloaded, accepted) {
    appSetMessage("Baixados: " + downloaded + " • válidos: " + accepted);
  })
    .then(function(radars) {
      if (!radars.length) {
        throw new Error("Base vazia");
      }

      databaseSaveRadars(radars, function(error) {
        button.disabled = false;
        button.textContent = "ATUALIZAR RADARES";

        if (error) {
          appSetMessage(error.message);
          return;
        }

        localStorage.setItem("radarDatabaseUpdatedAt", new Date().toISOString());
        radarSetList(radars);
        appUpdateDatabaseStatus(radars.length);
        appSetMessage("Base atualizada com sucesso.");
      });
    })
    .catch(function(error) {
      button.disabled = false;
      button.textContent = "ATUALIZAR RADARES";
      console.error("Radar update failed:", error);
      appSetMessage("Não foi possível atualizar a base online.");
    });
}
