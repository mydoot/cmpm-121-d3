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

/* const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map); */

class Player {
  public playerPoints: number;
  private playerMarker: leaflet.Marker<any>;
  public hasToken: boolean;

  constructor(map: leaflet.Map) {
    this.playerPoints = 0;
    this.playerMarker = leaflet.marker(CLASSROOM_LATLNG);
    this.playerMarker.addTo(map);
    this.hasToken = false;
  }

  updateStatusDiv(string: string): void {
    statusPanelDiv.innerHTML = string;
  }
}

statusPanelDiv.innerHTML = `You don't have a token.`;

const player = new Player(map);

class Token {
  public tokenAmount: number;

  constructor() {
    this.tokenAmount = 0;
  }
  addTokens(i: number, j: number, num: number): void {
    //addTokens() take in random x, y coord values from spawnCache() for the purposes of random number gen
    this.tokenAmount = Math.floor(
      luck([i, j, "initialValue"].toString()) * (num + 1),
    );
  }
  removeTokens(num: number): void {
    this.tokenAmount -= num;
  }
  getTokens(): number {
    return this.tokenAmount;
  }
  combineTokens(): void {
    //console.log("combining");
    if (player.playerPoints == this.tokenAmount) {
      this.tokenAmount *= 2;
      player.playerPoints = 0;
      player.hasToken = false;
      player.updateStatusDiv(
        `You don't have a token.`,
      );
    }
  }
}

function spawnCache(x: number, y: number) {
  const lat: number = CLASSROOM_LATLNG.lat + y * TILE_DEGREES;
  const lng: number = CLASSROOM_LATLNG.lng + x * TILE_DEGREES;

  // Draw cell boundary (non-interactive)
  const bounds: [number, number][] = [
    [lat - half, lng - half],
    [lat + half, lng + half],
  ];
  // leaflet.rectangle expects LatLngBoundsLike; supply array-of-array form
  const rect = leaflet.rectangle(
    [
      [bounds[0][0], bounds[0][1]],
      [bounds[1][0], bounds[1][1]],
    ],
    { color: "#0078ff", weight: 1, fill: true, interactive: true },
  );
  rect.addTo(map);

  // Spawn a cache with a probability
  // Handle interactions with the cache
  rect.on("click", () => {
    // Each cache has a random point value, mutable by the player

    const token = new Token();
    token.addTokens(x, y, 12);

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${lat},${lng}". <br/>Contains a token of value [<span id="value">${token.getTokens()}</span>]</div>
                <button id="poke">Take</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#poke")!
      .addEventListener("click", () => {
        if (player.hasToken) {
          token.combineTokens();
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = token
            .getTokens().toString();
        } else {
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = "0";
          player.playerPoints = token.getTokens();
          player.updateStatusDiv(
            `You have a token of value ${player.playerPoints}.`,
          );

          player.hasToken = true;
        }
      });

    rect.bindPopup(popupDiv).openPopup();
  });
}

// Draw a simple square grid centered on the classroom and spawn caches
const half = TILE_DEGREES / 2;
for (let dx = -NEIGHBORHOOD_SIZE; dx <= NEIGHBORHOOD_SIZE; dx++) {
  for (let dy = -NEIGHBORHOOD_SIZE; dy <= NEIGHBORHOOD_SIZE; dy++) {
    // Spawn a cache with a probability
    if (luck([dx, dy].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(dx, dy);
    }
  }
}
