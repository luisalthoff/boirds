var UPDATE_DATABASE_URL = "data/radars.json";

function updateLoadBundledDatabase() {
  return fetch(UPDATE_DATABASE_URL, { cache: "no-store" })
    .then(function(response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return response.json();
    })
    .then(function(data) {
      if (!data || !Array.isArray(data.radars) || !data.radars.length) {
        throw new Error("Base inválida ou vazia");
      }

      return data;
    });
}

function updateRadars() {
  var button = document.getElementById("btnUpdate");

  alertPrepareAudio();
  button.disabled = true;
  button.textContent = "ATUALIZANDO...";
  appSetMessage("Carregando base publicada...");

  updateLoadBundledDatabase()
    .then(function(data) {
      databaseSaveRadars(data.radars, function(error) {
        button.disabled = false;
        button.textContent = "ATUALIZAR RADARES";

        if (error) {
          appSetMessage(error.message);
          return;
        }

        if (data.updatedAt) {
          localStorage.setItem("radarDatabaseUpdatedAt", data.updatedAt);
        } else {
          localStorage.setItem("radarDatabaseUpdatedAt", new Date().toISOString());
        }

        radarSetList(data.radars);
        appUpdateDatabaseStatus(data.radars.length);
        appSetMessage("Base atualizada com sucesso.");
      });
    })
    .catch(function(error) {
      button.disabled = false;
      button.textContent = "ATUALIZAR RADARES";
      console.error("Radar update failed:", error);
      appSetMessage("Não foi possível carregar a base publicada.");
    });
}
