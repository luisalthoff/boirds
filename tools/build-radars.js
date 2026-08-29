#!/usr/bin/env node

const fs = require("fs");

const INPUT = process.argv[2] || "maparadar-sc-pr-sp-raw.json";
const OUTPUT = process.argv[3] || "../data/radars.json";

const TYPE_NAMES = {
  1: "Radar Fixo",
  2: "Semáforo com Radar",
  4: "Radar de Trecho",
  5: "Radar Móvel"
};

// Local development radar kept from the previous Radar BR database.
const TEST_RADAR = {
  id: "TEST-SC0000",
  type: 1,
  speed: 100,
  lat: -26.99926597106059,
  lon: -48.622971068916385,
  direction: null,
  dual: false,
  all: true,
  road: "3500",
  km: 0
};

function compactPoi(poi) {
  const radar = {
    id: Number(poi.id),
    type: Number(poi.type),
    speed: Number(poi.speed),
    lat: Number(poi.latitude),
    lon: Number(poi.longitude),
    direction: poi.allDirections ? null : Number(poi.direction),
    dual: Boolean(poi.isDualDirection),
    all: Boolean(poi.allDirections)
  };

  if (poi.highway) {
    radar.road = poi.highway;
  }

  if (poi.kilometer !== null && poi.kilometer !== undefined) {
    radar.km = poi.kilometer;
  }

  return radar;
}

const source = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const pois = Array.isArray(source.pois) ? source.pois : [];

const radars = pois
  .filter(function(poi) {
    return TYPE_NAMES[Number(poi.type)] &&
      !poi.isDeleted &&
      Number.isFinite(Number(poi.latitude)) &&
      Number.isFinite(Number(poi.longitude)) &&
      Number.isFinite(Number(poi.speed));
  })
  .map(compactPoi);

radars.push(TEST_RADAR);

const output = {
  source: "MapaRadar",
  states: ["SC", "PR", "SP"],
  types: TYPE_NAMES,
  count: radars.length,
  radars: radars
};

fs.writeFileSync(OUTPUT, JSON.stringify(output) + "\n");

const counts = {};
radars.forEach(function(radar) {
  const key = radar.id === TEST_RADAR.id ? "test" : String(radar.type);
  counts[key] = (counts[key] || 0) + 1;
});

console.log("Radar BR - MapaRadar compact database");
console.log("-------------------------------------");
console.log("Source POIs : " + pois.length);
console.log("Output      : " + radars.length + " (includes 1 local test radar)");
Object.keys(TYPE_NAMES).forEach(function(type) {
  console.log("Type " + type + "      : " + (counts[type] || 0) + " - " + TYPE_NAMES[type]);
});
console.log("Generated   : " + OUTPUT);
