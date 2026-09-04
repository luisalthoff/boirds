#!/usr/bin/env node

const fs = require("fs");

const INPUT = process.argv[2] || "source.json";
const OUTPUT = process.argv[3] || "../data/radars.json";
const INCLUDED_TYPES = new Set([1, 2, 4, 5]);

function normalizeAngle(value) {
  value = Number(value) % 360;
  return value < 0 ? value + 360 : value;
}

function detection(poi) {
  if (poi.allDirections) return 0;
  if (poi.isDualDirection) return 2;
  return 1;
}

function direction(poi, mode) {
  const azimuth = normalizeAngle(poi.direction || 0);
  if (mode === 0 || mode === 2) return 0;
  return ((azimuth > 90 && azimuth < 270) || azimuth === 270) ? 1 : -1;
}

function compact(poi) {
  const mode = detection(poi);
  return {
    lat: Number(poi.latitude), lon: Number(poi.longitude), speed: Number(poi.speed),
    detection: mode, direction: direction(poi, mode)
  };
}

const source = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const pois = Array.isArray(source.pois) ? source.pois : [];
const radars = pois.filter(poi =>
  poi && !poi.isDeleted && INCLUDED_TYPES.has(Number(poi.type)) &&
  Number(poi.speed) >= 30 && Number.isFinite(Number(poi.latitude)) &&
  Number.isFinite(Number(poi.longitude))
).map(compact);

fs.writeFileSync(OUTPUT, JSON.stringify({ updatedAt: new Date().toISOString(), radars }) + "\n");
console.log(`Generated ${radars.length} radars: ${OUTPUT}`);
