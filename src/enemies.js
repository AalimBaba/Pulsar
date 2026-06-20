import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getScene } from './scene.js';
import { addBody, removeBody, syncPhysicsToGraphics, createSphereBody } from './physics.js';
import { fireProjectile } from './weapons.js';

const enemies = [];
const enemySpeed = 8;
const enemyDetectionRange = 50;
const enemyAttackRange = 25;
const enemyHealth = 50;
const enemyFireCooldown = 2000;

let onEnemyDeathCallback = null;

export function setOnEnemyDeathCallback(callback) {
  onEnemyDeathCallback = callback;
}

export function createEnemy(position) {
  const geometry = new THREE.OctahedronGeometry(1.2, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    emissive: 0x440000,
    roughness: 0.4,
    metalness: 0.6
  });
  const enemyMesh = new THREE.Mesh(geometry, material);
  enemyMesh.castShadow = true;
  enemyMesh.receiveShadow = true;
  enemyMesh.position.copy(position);
  getScene().add(enemyMesh);

  const enemyBody = createSphereBody(1.2, 10, position, null);
  enemyBody.linearDamping = 0.3;
  enemyBody.angularDamping = 0.3;
  addBody(enemyBody);

  const enemy = {
    mesh: enemyMesh,
    body: enemyBody,
    health: enemyHealth,
    lastFireTime: 0,
    target: null,
    id: Date.now() + Math.random()
  };

  enemies.push(enemy);
  return enemy;
}

export function updateEnemies(deltaTime, playerPosition, echoes) {
  const now = performance.now();

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (enemy.health <= 0) {
      removeEnemy(i);
      continue;
    }

    let closestTarget = null;
    let closestDistance = Infinity;

    const playerDistance = enemy.mesh.position.distanceTo(playerPosition);
    if (playerDistance < enemyDetectionRange) {
      closestTarget = playerPosition;
      closestDistance = playerDistance;
    }

    for (const echo of echoes) {
      const echoDistance = enemy.mesh.position.distanceTo(echo.mesh.position);
      if (echoDistance < enemyDetectionRange && echoDistance < closestDistance) {
        closestTarget = echo.mesh.position;
        closestDistance = echoDistance;
      }
    }

    if (closestTarget) {
      const direction = new THREE.Vector3()
        .subVectors(closestTarget, enemy.mesh.position)
        .normalize();

      const velocity = enemy.body.velocity;
      velocity.x = direction.x * enemySpeed;
      velocity.z = direction.z * enemySpeed;

      enemy.body.velocity.copy(velocity);

      if (closestDistance < enemyAttackRange && now - enemy.lastFireTime > enemyFireCooldown) {
        enemy.lastFireTime = now;
        const fireDirection = direction.clone();
        fireProjectile(enemy.mesh.position.clone(), fireDirection, 'enemy');
      }
    } else {
      enemy.body.velocity.multiplyScalar(0.95);
    }

    syncPhysicsToGraphics(enemy.mesh, enemy.body);
  }
}

export function removeEnemy(index) {
  const enemy = enemies[index];
  if (!enemy) return;

  getScene().remove(enemy.mesh);
  removeBody(enemy.body);
  enemy.mesh.geometry.dispose();
  enemy.mesh.material.dispose();

  if (onEnemyDeathCallback) {
    onEnemyDeathCallback(enemy.mesh.position.clone());
  }

  enemies.splice(index, 1);
}

export function damageEnemy(enemy, amount) {
  enemy.health -= amount;
  enemy.mesh.material.emissive.setHex(0xff0000);
  setTimeout(() => {
    if (enemy.mesh && enemy.mesh.material) {
      enemy.mesh.material.emissive.setHex(0x440000);
    }
  }, 100);
}

export function getEnemyAtPosition(position, radius) {
  for (const enemy of enemies) {
    const distance = enemy.mesh.position.distanceTo(position);
    if (distance < radius) {
      return enemy;
    }
  }
  return null;
}

export function getEnemies() {
  return enemies;
}

export function getEnemyCount() {
  return enemies.length;
}

export function clearAllEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    removeEnemy(i);
  }
}

export function spawnEnemies(count, areaSize) {
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * areaSize;
    const z = (Math.random() - 0.5) * areaSize;
    const position = new THREE.Vector3(x, 2, z);
    createEnemy(position);
  }
}

export function cleanup() {
  clearAllEnemies();
}
