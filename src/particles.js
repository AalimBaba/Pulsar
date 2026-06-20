import * as THREE from 'three';
import { getScene } from './scene.js';

const maxParticles = 5000;
const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(maxParticles * 3);
const colors = new Float32Array(maxParticles * 3);
const sizes = new Float32Array(maxParticles);
const lifetimes = new Float32Array(maxParticles);
const velocities = [];

for (let i = 0; i < maxParticles; i++) {
  velocities.push(new THREE.Vector3());
  lifetimes[i] = 0;
  sizes[i] = 0;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particleMaterial = new THREE.PointsMaterial({
  size: 0.5,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true
});

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
particleSystem.frustumCulled = false;
getScene().add(particleSystem);

const activeParticles = new Set();
const particlePool = [];

for (let i = 0; i < maxParticles; i++) {
  particlePool.push(i);
}

const trailHistory = [];
const maxTrailLength = 50;

export function createExplosion(position, color, count = 50, spread = 5) {
  const indicesToUse = [];

  for (let i = 0; i < count && particlePool.length > 0; i++) {
    const index = particlePool.pop();
    indicesToUse.push(index);
    activeParticles.add(index);

    positions[index * 3] = position.x;
    positions[index * 3 + 1] = position.y;
    positions[index * 3 + 2] = position.z;

    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    colors[index * 3] = r;
    colors[index * 3 + 1] = g;
    colors[index * 3 + 2] = b;

    sizes[index] = Math.random() * 0.8 + 0.2;
    lifetimes[index] = 1.0;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = Math.random() * spread;

    velocities[index].set(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.cos(phi) * speed,
      Math.sin(phi) * Math.sin(theta) * speed
    );
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
  particleGeometry.attributes.size.needsUpdate = true;
}

export function createTrail(position, color) {
  trailHistory.push({
    position: position.clone(),
    color: color,
    lifetime: 1.0
  });

  if (trailHistory.length > maxTrailLength) {
    trailHistory.shift();
  }
}

export function updateParticles(deltaTime) {
  const indicesToRemove = [];

  for (const index of activeParticles) {
    lifetimes[index] -= deltaTime * 2;

    if (lifetimes[index] <= 0) {
      indicesToRemove.push(index);
      continue;
    }

    positions[index * 3] += velocities[index].x * deltaTime;
    positions[index * 3 + 1] += velocities[index].y * deltaTime;
    positions[index * 3 + 2] += velocities[index].z * deltaTime;

    velocities[index].y -= 9.82 * deltaTime * 0.5;

    const alpha = lifetimes[index];
    sizes[index] *= 0.98;

    colors[index * 3] *= 0.99;
    colors[index * 3 + 1] *= 0.99;
    colors[index * 3 + 2] *= 0.99;
  }

  for (const index of indicesToRemove) {
    activeParticles.delete(index);
    particlePool.push(index);
    sizes[index] = 0;
  }

  for (let i = trailHistory.length - 1; i >= 0; i--) {
    trailHistory[i].lifetime -= deltaTime * 3;
    if (trailHistory[i].lifetime <= 0) {
      trailHistory.splice(i, 1);
    }
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
  particleGeometry.attributes.size.needsUpdate = true;
}

export function renderTrails() {
  const trailIndices = [];

  for (const trail of trailHistory) {
    if (particlePool.length > 0) {
      const index = particlePool.pop();
      trailIndices.push(index);

      positions[index * 3] = trail.position.x;
      positions[index * 3 + 1] = trail.position.y;
      positions[index * 3 + 2] = trail.position.z;

      const r = ((trail.color >> 16) & 255) / 255;
      const g = ((trail.color >> 8) & 255) / 255;
      const b = (trail.color & 255) / 255;

      colors[index * 3] = r * trail.lifetime;
      colors[index * 3 + 1] = g * trail.lifetime;
      colors[index * 3 + 2] = b * trail.lifetime;

      sizes[index] = 0.3 * trail.lifetime;
    }
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
  particleGeometry.attributes.size.needsUpdate = true;

  for (const index of trailIndices) {
    activeParticles.add(index);
    lifetimes[index] = trailHistory[trailIndices.indexOf(index)]?.lifetime || 0;
    velocities[index].set(0, 0, 0);
  }
}

export function clearAllParticles() {
  for (const index of activeParticles) {
    particlePool.push(index);
    sizes[index] = 0;
  }
  activeParticles.clear();
  trailHistory.length = 0;

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
  particleGeometry.attributes.size.needsUpdate = true;
}

export function getActiveParticleCount() {
  return activeParticles.size;
}

export function cleanup() {
  clearAllParticles();
  getScene().remove(particleSystem);
  particleGeometry.dispose();
  particleMaterial.dispose();
}
