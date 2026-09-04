#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const API = "https://api.maparadar.com/poi";
const LIMIT = 10000;
const TYPES = "1,2,4,5";
const OUTPUT = process.argv[2] || "../data/radars.json";
const PRETTY_OUTPUT = process.argv[3] || "radars-pretty.json";
const BOUNDS = { north: 6, south: -34, east: -34.5, west: -74.2 };

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
    Number(poi.speed) >= 30 &&
    Number.isFinite(Number(poi.latitude)) &&
    Number.isFinite(Number(poi.longitude));
}

async function fetchPage(offset) {
  const params = new URLSearchParams({
    limit: String(LIMIT),
    offset: String(offset),
    showNormal: "true",
    showInvalidLocation: "false",
    showNoDirectionDual: "false",
    showNoDirectionSingle: "false",
    showDeleted: "false",
    north: String(BOUNDS.north),
    south: String(BOUNDS.south),
    east: String(BOUNDS.east),
    west: String(BOUNDS.west),
    types: TYPES
  });

  const response = await fetch(`${API}?${params}`, {
    headers: {
      Accept: "application/json, text/plain, */*",
      Referer: "https://mapa.maparadar.com/"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function writeDatabases(radars) {
  const data = { updatedAt: new Date().toISOString(), radars };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.mkdirSync(path.dirname(PRETTY_OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(data) + "\n");
  fs.writeFileSync(PRETTY_OUTPUT, JSON.stringify(data, null, 2) + "\n");
}

async function main() {
  const radars = [];
  let offset = 0;

  while (true) {
    console.log(`Baixando offset ${offset}...`);

    const data = await fetchPage(offset);
    const pois = Array.isArray(data.pois) ? data.pois : [];

    for (const poi of pois) {
      if (valid(poi)) radars.push(compact(poi));
    }

    offset += pois.length;
    console.log(`Recebidos: ${pois.length} • válidos acumulados: ${radars.length}`);

    if (pois.length < LIMIT) break;
  }

  writeDatabases(radars);
  console.log(`Feito: ${radars.length} radares -> ${OUTPUT}`);
  console.log(`Cópia formatada -> ${PRETTY_OUTPUT}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
