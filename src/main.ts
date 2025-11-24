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

const controlSchemeDiv = document.createElement("button");
controlSchemeDiv.id = "controlScheme";
controlSchemeDiv.innerHTML = "Switch to geolocation";
document.body.append(controlSchemeDiv);

let controlScheme: string = "manual"; //either manual or geolocation

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const ORIGIN_LATLNG = leaflet.latLng(
  0,
  0,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
//const NEIGHBORHOOD_SIZE = 8;
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

controlSchemeDiv.addEventListener("mousedown", () => {
  if (controlScheme == "manual") {
    controlScheme = "geolocation";
    controlSchemeDiv.innerHTML = "Switch to manual";
    console.log(controlScheme);
  } else if (controlScheme == "geolocation") {
    controlScheme = "manual";
    controlSchemeDiv.innerHTML = "Switch to geolocation";
    console.log(controlScheme);
  }
});

const options = {
  // Try to get the best possible location (often uses GPS, increases battery drain)
  enableHighAccuracy: true,
  // Maximum time (in ms) to wait for a position.
  timeout: 5000,
  // Don't use a cached position older than this (in ms).
  maximumAge: 0,
};

if (controlScheme == "geolocation") {
  if ("geolocation" in navigator) {
    // Geolocation is supported! Proceed to get location.
    navigator.geolocation.watchPosition(success, error, options);
  } else {
    // Geolocation is not available—provide a fallback message.
    alert(
      "Geolocation is not supported by your browser. Running in manual mode",
    );
    controlScheme = "manual";
  }
}

function success(position: GeolocationPosition) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  //const accuracy = position.coords.accuracy;

  player.setPlayerLatLng(leaflet.latLng(latitude, longitude));
}

function error(err: GeolocationPositionError) {
  // Handle different error codes (e.g., 1 for permission denied).
  console.warn(`ERROR(${err.code}): ${err.message}`);
  console.log(`Running in manual mode`);
  controlScheme = "manual";
  // **Game Logic:**
  // Provide a friendly message and a graceful fallback, or end the game.
}

interface cacheRectangle extends leaflet.Rectangle {
  __mementoKey: string;
  __memento: CellMemento;
}

class Player {
  public playerPoints: number;
  public playerMarker: leaflet.Marker;
  public hasToken: boolean;
  public winCondition: number;
  //private playerLocation: number;

  constructor(map: leaflet.Map) {
    this.playerPoints = 0;
    this.playerMarker = leaflet.marker(CLASSROOM_LATLNG);
    this.playerMarker.bindTooltip("This is you.");
    this.playerMarker.addTo(map);
    this.hasToken = false;
    this.winCondition = 256;
  }

  updateStatusDiv(string: string): void {
    statusPanelDiv.innerHTML = string;
  }

  setPlayerLatLng(newLatLng: leaflet.LatLng) {
    player.playerMarker.setLatLng(newLatLng);
    map.panTo(newLatLng, { animate: true, duration: 0.15 });
    updateVisibleCaches();
  }

  updatePlayerPoints(token: Token) {
    player.playerPoints = token.getTokens();
    if (player.playerPoints == player.winCondition) {
      alert("Congratulations! You have won the game!");
    } else {
      player.updateStatusDiv(
        `You have a token of value ${player.playerPoints}.`,
      );
      player.hasToken = true;
    }
  }

  movePlayer(): void {
  }
}

statusPanelDiv.innerHTML = `You don't have a token.`;

const player = new Player(map);

class Token {
  private tokenAmount: number;

  constructor() {
    this.tokenAmount = 0;
  }

  //addTokens() take in random x, y coord values from
  //spawnCache() for the purposes of random number generation
  addTokens(num: number): void {
    this.tokenAmount = num;
  }

  removeTokens(num: number): number {
    this.tokenAmount -= num;
    return this.tokenAmount;
  }

  getTokens(): number {
    return this.tokenAmount;
  }

  combineTokens(): void {
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

// Flyweight using Map
type CellStyle = { color: string; weight: number; fill: boolean };
class FlyweightFactory {
  private styleMap = new Map<string, CellStyle>();
  getStyle(key = "default"): CellStyle {
    const existing = this.styleMap.get(key);
    if (existing) return existing;
    const style: CellStyle = { color: "#0078ff", weight: 1, fill: true };
    this.styleMap.set(key, style);
    return style;
  }
}

const flyweight = new FlyweightFactory();

export type CellMemento = {
  //tokensRemaining: number;
  visited?: boolean;
  lastTakenAt?: number;
  tokens: number;
  taken: boolean;
};

export class MementoStore {
  private map = new Map<string, CellMemento>();
  constructor(private storageKey = "game.cell.mementos") {
    this.loadFromStorage();
  }

  key(x: number, y: number) {
    return `${x},${y}`;
  }

  get(x: number, y: number): CellMemento | undefined {
    return this.map.get(this.key(x, y));
  }

  set(x: number, y: number, m: CellMemento) {
    this.map.set(this.key(x, y), m);
  }

  delete(x: number, y: number) {
    this.map.delete(this.key(x, y));
  }

  persistToStorage() {
    try {
      const arr = Array.from(this.map.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(arr));
    } catch {
      /* ignore */
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw) as [string, CellMemento][];
      for (const [k, v] of arr) this.map.set(k, v);
    } catch {
      /* ignore */
    }
  }
}

const mementos = new MementoStore();

// NOTE: caches are created on-demand via `createCacheLayer` below.

// Draw a simple square grid centered on the classroom and spawn caches
const half = TILE_DEGREES / 2;

// Visible/cache management: create cache layers only when they are near the player
const spawnedLayers = new Map<string, leaflet.Layer>();
function keyFor(x: number, y: number) {
  return `${x},${y}`;
}

function cacheExistsAt(x: number, y: number) {
  return luck([x, y].toString()) < CACHE_SPAWN_PROBABILITY;
}

function createCacheLayer(x: number, y: number): leaflet.Layer {
  const lat: number = ORIGIN_LATLNG.lat + y * TILE_DEGREES;
  const lng: number = ORIGIN_LATLNG.lng + x * TILE_DEGREES;
  const style = flyweight.getStyle("default");

  // restore or create minimal memento
  const saved = mementos.get(x, y) ??
    {
      visited: false,
      tokens: Math.floor(
        luck([x, y, "initialValue"].toString()) * (13),
      ),
      taken: false,
    };

  const rect: leaflet.Rectangle = leaflet.rectangle([[lat - half, lng - half], [
    lat + half,
    lng + half,
  ]], {
    color: style.color,
    weight: style.weight,
    fill: style.fill,
    interactive: true,
  });

  const cacheRect = rect as cacheRectangle;
  cacheRect.__mementoKey = mementos.key(x, y);
  cacheRect.__memento = saved;

  // Handle interactions with the cache (same behavior as before)
  rect.on("click", () => {
    const token = new Token();
    if (!saved.taken) {
      token.addTokens(saved.tokens);
    } else {
      token.addTokens(0);
    }
    //saved.taken = true;
    const cacheRect = rect as cacheRectangle;
    const m = cacheRect.__memento;

    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${lat},${lng}". <br/>Contains a token of value [<span id="value">${token.getTokens()}</span>]</div>
                <button id="poke">Take</button>`;

    popupDiv
      .querySelector<HTMLButtonElement>("#poke")!
      .addEventListener("click", () => {
        console.log("fire");
        //console.log(m.tokensRemaining);
        console.log(`token in cache: ${token.getTokens()}`);
        if (token.getTokens() > 0) {
          //popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = token.getTokens().toString();
          if (player.hasToken) {
            token.combineTokens();
            popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = token
              .getTokens().toString();
          } else {
            player.updatePlayerPoints(token);
            popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = token
              .removeTokens(token.getTokens()).toString();
          }
        }
        saved.taken = true;
        mementos.set(x, y, m);
        mementos.persistToStorage();
      });

    rect.bindPopup(popupDiv).openPopup();
  });

  return rect;
}

/* // when you remove a layer:
function removeAndSaveLayer(key: string, layer: leaflet.Layer) {
  const mkey = (layer as any).__mementoKey as string | undefined;
  const m = (layer as any).__memento as CellMemento | undefined;
  if (mkey && m) {
    mementos.set(...mkey.split(",").map(Number), m); // or parse key properly
  }
  layer.off && layer.off();
  map.removeLayer(layer);
  mementos.persistToStorage();
} */

// Visibility tuning
const VISIBLE_RADIUS_TILES = 3; // tiles in each direction to keep visible
const PREFETCH_RADIUS = 1; // extra buffer to avoid thrash

// Movement step (move one tile per keypress)
const MOVE_STEP = TILE_DEGREES;

// Keyboard movement (WASD + arrows)
if (controlScheme == "manual") {
  globalThis.addEventListener("keydown", (e) => {
    const cur = player.playerMarker.getLatLng();
    let lat = cur.lat;
    let lng = cur.lng;
    if (e.key === "ArrowUp" || e.key === "w") lat += MOVE_STEP;
    if (e.key === "ArrowDown" || e.key === "s") lat -= MOVE_STEP;
    if (e.key === "ArrowLeft" || e.key === "a") lng -= MOVE_STEP;
    if (e.key === "ArrowRight" || e.key === "d") lng += MOVE_STEP;
    player.setPlayerLatLng(leaflet.latLng(lat, lng));
  });
} else if (controlScheme == "geolocation") {
  globalThis.removeEventListener("keydown", () => {});
}

function updateVisibleCaches() {
  const center = player.playerMarker.getLatLng();
  const centerX = Math.round(
    (center.lng - ORIGIN_LATLNG.lng) / TILE_DEGREES,
  );
  const centerY = Math.round(
    (center.lat - ORIGIN_LATLNG.lat) / TILE_DEGREES,
  );
  const maxR = VISIBLE_RADIUS_TILES + PREFETCH_RADIUS;

  const allowed = new Set<string>();
  for (let dx = -maxR; dx <= maxR; dx++) {
    for (let dy = -maxR; dy <= maxR; dy++) {
      const rx = centerX + dx;
      const ry = centerY + dy;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist <= VISIBLE_RADIUS_TILES) {
        const key = keyFor(rx, ry);
        allowed.add(key);
        if (!spawnedLayers.has(key) && cacheExistsAt(rx, ry)) {
          const layer = createCacheLayer(rx, ry);
          spawnedLayers.set(key, layer);
          layer.addTo(map);
        }
      }
    }
  }

  // Remove layers that are no longer allowed
  for (const key of Array.from(spawnedLayers.keys())) {
    if (!allowed.has(key)) {
      const layer = spawnedLayers.get(key)!;
      map.removeLayer(layer);
      spawnedLayers.delete(key);
    }
  }
}

// Update when camera stops moving (in case camera can be moved independent of player)
map.on("moveend", updateVisibleCaches);

// Initial population around player
updateVisibleCaches();
