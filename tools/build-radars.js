#!/usr/bin/env node

const fs = require("fs");

const INPUT = process.argv[2] || "maparadar-sc-pr-sp-raw.json";
const OUTPUT = process.argv[3] || "../data/radars.json";

function directionMode(poi) {
  if (poi.allDirections) return 0;
  if (poi.isDualDirection) return 2;
  return 1;
}

function compactPoi(poi) {
  return {
    id: Number(poi.id),
    lat: Number(poi.latitude),
    lon: Number(poi.longitude),
    speed: Number(poi.speed),
    directionMode: directionMode(poi),
    direction: ((Number(poi.direction) || 0) % 360 + 360) % 360
  };
}

const source = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const pois = Array.isArray(source.pois) ? source.pois : [];

const radars = pois
  .filter(function(poi) {
    return !poi.isDeleted &&
      Number.isFinite(Number(poi.latitude)) &&
      Number.isFinite(Number(poi.longitude)) &&
      Number.isFinite(Number(poi.speed));
  })
  .map(compactPoi)
  .sort(function(a, b) { return a.id - b.id; });

const output = {
  source: "MapaRadar",
  states: ["SC", "PR", "SP"],
  count: radars.length,
  directionMode: { "0": "all", "1": "single", "2": "dual" },
  radars: radars
};

fs.writeFileSync(OUTPUT, JSON.stringify(output) + "\n");
console.log("Generated " + radars.length + " radars: " + OUTPUT);
