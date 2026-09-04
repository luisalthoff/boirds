#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const INPUT = process.argv[2] || "source.json";
const OUTPUT = process.argv[3] || "../data/radars.json";
const PRETTY_OUTPUT = process.argv[4] || "radars-pretty.json";
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

  // Southward half = +1; northward half = -1.
  // Boundary convention: 90° -> -1 and 270° -> +1.
  return ((azimuth > 90 && azimuth < 270) || azimuth === 270) ? 1 : -1;
}

function compact(poi) {
  const mode = detection(poi);

  return {
    lat: Number(poi.latitude),
    lon: Number(poi.longitude),
    speed: Number(poi.speed),
    detection: mode,
    direction: direction(poi, mode)
  };
}

function valid(poi) {
  return poi &&
    !poi.isDeleted &&
    INCLUDED_TYPES.has(Number(poi.type)) &&
    Number(poi.speed) >= 30 &&
    Number.isFinite(Number(poi.latitude)) &&
    Number.isFinite(Number(poi.longitude));
}

function writeDatabases(output, prettyOutput, radars) {
  const data = { updatedAt: new Date().toISOString(), radars };

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(path.dirname(prettyOutput), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(data) + "\n");
  fs.writeFileSync(prettyOutput, JSON.stringify(data, null, 2) + "\n");
}

const source = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const pois = Array.isArray(source.pois) ? source.pois : [];
const radars = pois.filter(valid).map(compact);

writeDatabases(OUTPUT, PRETTY_OUTPUT, radars);
console.log(`Generated ${radars.length} radars: ${OUTPUT}`);
console.log(`Pretty copy: ${PRETTY_OUTPUT}`);
