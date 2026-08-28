#!/usr/bin/env node

const fs = require("fs");

const INPUT = process.argv[2] || "radares.json";
const OUTPUT = process.argv[3] || "../data/radars.json";

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  return Number(String(value).replace(",", "."));
}

function speed(radar) {
  var value = Number(radar.velocidade_leve);

  // ANTT source correction confirmed against the posted 100 km/h road sign:
  // BR-101, Joinville, km 40.9, sentido Crescente.
  if (
    radar.uf === "SC" &&
    radar.rodovia === "BR-101" &&
    radar.municipio === "Joinville" &&
    radar.km_m === "40,9" &&
    radar.sentido === "Crescente" &&
    value === 10
  ) {
    return 100;
  }

  return value;
}

function compareRadar(a, b) {
  var road = a.road.localeCompare(b.road, "pt-BR");
  if (road !== 0) return road;
  if (a.km !== b.km) return a.km - b.km;
  return a.direction.localeCompare(b.direction, "pt-BR");
}

var source = JSON.parse(fs.readFileSync(INPUT, "utf8"));
var records = Array.isArray(source.radar) ? source.radar : [];

var radars = records
  .filter(function(radar) {
    return radar.uf === "SC";
  })
  .map(function(radar) {
    return {
      road: radar.rodovia,
      km: number(radar.km_m),
      city: radar.municipio,
      direction: radar.sentido,
      type: radar.tipo_de_radar,
      lane: radar.tipo_de_pista,
      speed: speed(radar),
      lat: number(radar.latitude),
      lon: number(radar.longitude)
    };
  })
  .sort(compareRadar)
  .map(function(radar, index) {
    radar.id = "SC" + String(index + 1).padStart(4, "0");
    return {
      id: radar.id,
      road: radar.road,
      km: radar.km,
      city: radar.city,
      direction: radar.direction,
      type: radar.type,
      lane: radar.lane,
      speed: radar.speed,
      lat: radar.lat,
      lon: radar.lon
    };
  });

var output = {
  source: "ANTT",
  state: "SC",
  count: radars.length,
  radars: radars
};

fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n");

var speeds = {};
var roads = {};

radars.forEach(function(radar) {
  speeds[radar.speed] = (speeds[radar.speed] || 0) + 1;
  roads[radar.road] = (roads[radar.road] || 0) + 1;
});

console.log("");
console.log("Radar BR - Santa Catarina");
console.log("-------------------------");
console.log("ANTT total : " + records.length);
console.log("SC total   : " + radars.length);
console.log("");
console.log("Por rodovia:");
Object.keys(roads).sort().forEach(function(road) {
  console.log("  " + road + ": " + roads[road]);
});
console.log("");
console.log("Por velocidade:");
Object.keys(speeds).sort(function(a, b) { return Number(a) - Number(b); })
  .forEach(function(value) {
    console.log("  " + value + " km/h: " + speeds[value]);
  });
console.log("");
console.log("Gerado: " + OUTPUT);
