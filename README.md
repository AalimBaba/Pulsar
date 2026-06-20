# Recursion Echo

A mechanics-driven action/puzzle WebGL game where you interact with recursive loop clones ("Echoes") of your past actions to solve puzzles or defeat enemies.

## Features

- **Time Loop Mechanics**: Record your actions and spawn Echo clones that replay your past movements
- **Combat System**: Fire projectiles at enemies that track both you and your Echoes
- **Puzzle Elements**: Interactive switches and gates requiring cooperation between player and Echoes
- **Particle Effects**: High-performance particle system for explosions and temporal trails
- **Physics Simulation**: Real-time physics using Cannon.js
- **3D Graphics**: WebGL rendering with Three.js

## Controls

- **WASD / Arrow Keys**: Move
- **Mouse**: Aim (click to lock pointer)
- **Space**: Fire projectiles
- **E**: Create Echo manually (or wait for 10-second time loop)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deployment to GitHub Pages

1. Create a new repository on GitHub
2. Add the remote repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/recursion-echo.git
   ```
3. Push to GitHub:
   ```bash
   git branch -M main
   git push -u origin main
   ```
4. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

The game will be available at `https://YOUR_USERNAME.github.io/recursion-echo/`

## Technologies

- Three.js - 3D graphics
- Cannon.js - Physics simulation
- Vite - Build tool
- vite-plugin-glsl - Custom shader support

## License

MIT
