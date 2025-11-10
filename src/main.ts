// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Ensure correct sizing after layout
map.whenReady(() => map.invalidateSize());

// Draw a simple square grid centered on the classroom and spawn caches
const half = TILE_DEGREES / 2;
for (let dx = -NEIGHBORHOOD_SIZE; dx <= NEIGHBORHOOD_SIZE; dx++) {
  for (let dy = -NEIGHBORHOOD_SIZE; dy <= NEIGHBORHOOD_SIZE; dy++) {
    const lat: number = CLASSROOM_LATLNG.lat + dy * TILE_DEGREES;
    const lng: number = CLASSROOM_LATLNG.lng + dx * TILE_DEGREES;

    // Draw cell boundary (non-interactive)
    const bounds: [number, number][] = [
      [lat - half, lng - half],
      [lat + half, lng + half],
    ];
    // leaflet.rectangle expects LatLngBoundsLike; supply array-of-array form
    leaflet
      .rectangle(
        [
          [bounds[0][0], bounds[0][1]],
          [bounds[1][0], bounds[1][1]],
        ],
        { color: "#0078ff", weight: 1, fill: false, interactive: false },
      )
      .addTo(map);

    // Spawn a cache with a probability
    if (luck([dx, dy].toString()) < CACHE_SPAWN_PROBABILITY) {
      const marker = leaflet.marker([lat, lng]).addTo(map);
      marker.bindPopup(
        `<strong>Cache</strong><br/>lat: ${lat.toFixed(6)}<br/>lng: ${
          lng.toFixed(6)
        }`,
      );
    }
  }
}
