# D3: World of Bits

# Game Design Vision

Create the game

# Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS collected in common `style.css` file
- Deno and Vite for buildqing
- GitHub Actions + GitHub Pages for deployment automation

# Assignments

## D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### Steps

- [x] Create the map
- [x] Implement grid on map
- [x] Add cell tokens
- [x] Create the inventory
- [x] Show token amount on screen
- [x] Create the crafting

## D3.b: Globe-spanning gameplay

Key technical challenge: Grid cells span the entire map/globe
Key gameplay challenge: Creating player movement, a victory condition.

### Steps

- [x] Add Player movement
- [x] Create global grid
- [x] Create victory condition
- []

## D3.c: Globe-spanning gameplay

Key technical challenge: Use a flyeweight pattern for grid cell memory management
Key gameplay challenge: Grid cells now remember their state (so if you take a token from a grid, then move so that grid despawns, when moving back you cannot retake that token again)

### Steps

- [] Implement a memory saving pattern
- [] Implement serialization for grids to retain their state after they are off-screen
