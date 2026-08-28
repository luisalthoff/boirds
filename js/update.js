function updateRadars() {
  var button = document.getElementById("btnUpdate");

  if (!window.fetch) {
    appSetMessage("Este navegador não suporta atualização online.");
    return;
  }

  button.disabled = true;
  button.textContent = "ATUALIZANDO...";
  appSetMessage("Baixando base de radares...");

  fetch("data/radars.json?ts=" + new Date().getTime(), {
    cache: "no-store"
  })
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Falha no download");
      }

      return response.json();
    })
    .then(function(data) {
      if (!data || !data.radars || !data.radars.length) {
        throw new Error("Base vazia");
      }

      databaseSaveRadars(data.radars, function(error) {
        button.disabled = false;
        button.textContent = "ATUALIZAR RADARES";

        if (error) {
          appSetMessage(error.message);
          return;
        }

        localStorage.setItem(
          "radarDatabaseUpdatedAt",
          data.updatedAt || new Date().toISOString()
        );

        radarSetList(data.radars);
        appUpdateDatabaseStatus(data.radars.length);
        appSetMessage("Base atualizada com sucesso.");
      });
    })
    .catch(function() {
      button.disabled = false;
      button.textContent = "ATUALIZAR RADARES";
      appSetMessage("Não foi possível atualizar. Verifique a internet.");
    });
}
