import * as THREE from 'three';
import { getScene } from './scene.js';

const projectiles = [];
const projectileSpeed = 40;
const projectileLifetime = 3;
const projectileDamage = 25;

const projectileGeometry = new THREE.SphereGeometry(0.2, 8, 8);
const projectilePool = [];
const maxPoolSize = 100;

let onProjectileHitCallback = null;

export function setOnProjectileHitCallback(callback) {
  onProjectileHitCallback = callback;
}

function getProjectileFromPool() {
  if (projectilePool.length > 0) {
    return projectilePool.pop();
  }
  return null;
}

function returnProjectileToPool(projectile) {
  if (projectilePool.length < maxPoolSize) {
    projectile.mesh.visible = false;
    projectilePool.push(projectile);
  } else {
    projectile.mesh.geometry.dispose();
    projectile.mesh.material.dispose();
  }
}

export function fireProjectile(position, direction, source) {
  let projectile = getProjectileFromPool();

  if (!projectile) {
    let color;
    if (source === 'player') {
      color = 0x00ff88;
    } else if (source === 'echo') {
      color = 0x00aaff;
    } else {
      color = 0xff4444;
    }

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(projectileGeometry, material);
    mesh.position.copy(position);
    getScene().add(mesh);

    projectile = {
      mesh: mesh,
      velocity: direction.clone().multiplyScalar(projectileSpeed),
      lifetime: projectileLifetime,
      source: source,
      damage: projectileDamage,
      active: true
    };
  } else {
    projectile.mesh.visible = true;
    projectile.mesh.position.copy(position);
    projectile.mesh.material.color.setHex(
      source === 'player' ? 0x00ff88 : source === 'echo' ? 0x00aaff : 0xff4444
    );
    projectile.velocity = direction.clone().multiplyScalar(projectileSpeed);
    projectile.lifetime = projectileLifetime;
    projectile.source = source;
    projectile.damage = projectileDamage;
    projectile.active = true;
  }

  projectiles.push(projectile);
  return projectile;
}

export function updateProjectiles(deltaTime) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];

    if (!projectile.active) {
      removeProjectile(i);
      continue;
    }

    projectile.mesh.position.add(projectile.velocity.clone().multiplyScalar(deltaTime));
    projectile.lifetime -= deltaTime;

    if (projectile.lifetime <= 0) {
      removeProjectile(i);
      continue;
    }

    const raycaster = new THREE.Raycaster(
      projectile.mesh.position.clone(),
      projectile.velocity.clone().normalize(),
      0,
      projectileSpeed * deltaTime
    );

    if (onProjectileHitCallback) {
      const hitResult = onProjectileHitCallback(projectile, raycaster);
      if (hitResult) {
        removeProjectile(i);
      }
    }
  }
}

export function removeProjectile(index) {
  const projectile = projectiles[index];
  if (!projectile) return;

  getScene().remove(projectile.mesh);
  returnProjectileToPool(projectile);
  projectiles.splice(index, 1);
}

export function getProjectiles() {
  return projectiles;
}

export function getProjectileCount() {
  return projectiles.length;
}

export function clearAllProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    removeProjectile(i);
  }
}

export function cleanup() {
  clearAllProjectiles();
  projectileGeometry.dispose();
  for (const projectile of projectilePool) {
    projectile.mesh.geometry.dispose();
    projectile.mesh.material.dispose();
  }
  projectilePool.length = 0;
}
