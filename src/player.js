import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getScene, getCamera } from './scene.js';
import { addBody, removeBody, syncPhysicsToGraphics, createSphereBody, getTempVec3 } from './physics.js';

let playerMesh;
let playerBody;
let health = 100;
let isDead = false;

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  fire: false,
  createEcho: false
};

let mouseX = 0;
let mouseY = 0;
let cameraAngleX = 0;
let cameraAngleY = 0;

const moveForce = 50;
const maxSpeed = 15;
const rotationSpeed = 0.003;

const timeLoopDuration = 10;
let currentTimeInLoop = 0;
let timeHistory = [];
const maxHistoryFrames = 600;

let lastFireTime = 0;
const fireCooldown = 150;

let lastEchoCreationTime = 0;
const echoCreationCooldown = 2000;

let onFireCallback = null;
let onCreateEchoCallback = null;

export function initPlayer() {
  const geometry = new THREE.ConeGeometry(0.8, 2, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x004422,
    roughness: 0.3,
    metalness: 0.7
  });
  playerMesh = new THREE.Mesh(geometry, material);
  playerMesh.castShadow = true;
  playerMesh.receiveShadow = true;
  playerMesh.position.y = 1;
  getScene().add(playerMesh);

  playerBody = createSphereBody(0.8, 5, { x: 0, y: 2, z: 0 }, null);
  playerBody.linearDamping = 0.5;
  playerBody.angularDamping = 0.5;
  playerBody.fixedRotation = true;
  addBody(playerBody);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
}

function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.backward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = true;
      break;
    case 'Space':
      keys.fire = true;
      break;
    case 'KeyE':
      keys.createEcho = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.backward = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = false;
      break;
    case 'Space':
      keys.fire = false;
      break;
    case 'KeyE':
      keys.createEcho = false;
      break;
  }
}

function onMouseMove(event) {
  if (document.pointerLockElement) {
    cameraAngleX -= event.movementX * rotationSpeed;
    cameraAngleY -= event.movementY * rotationSpeed;
    cameraAngleY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraAngleY));
  }
}

function onMouseDown(event) {
  if (event.button === 0) {
    document.body.requestPointerLock();
  }
}

function onMouseUp(event) {
  if (event.button === 0) {
    document.exitPointerLock();
  }
}

export function setOnFireCallback(callback) {
  onFireCallback = callback;
}

export function setOnCreateEchoCallback(callback) {
  onCreateEchoCallback = callback;
}

export function updatePlayer(deltaTime) {
  if (isDead) return;

  const velocity = playerBody.velocity;
  const currentSpeed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);

  const forward = new THREE.Vector3(
    Math.sin(cameraAngleX),
    0,
    Math.cos(cameraAngleX)
  );
  const right = new THREE.Vector3(
    Math.sin(cameraAngleX + Math.PI / 2),
    0,
    Math.cos(cameraAngleX + Math.PI / 2)
  );

  let forceX = 0;
  let forceZ = 0;

  if (keys.forward) {
    forceX += forward.x;
    forceZ += forward.z;
  }
  if (keys.backward) {
    forceX -= forward.x;
    forceZ -= forward.z;
  }
  if (keys.left) {
    forceX -= right.x;
    forceZ -= right.z;
  }
  if (keys.right) {
    forceX += right.x;
    forceZ += right.z;
  }

  if (forceX !== 0 || forceZ !== 0) {
    const forceMag = Math.sqrt(forceX ** 2 + forceZ ** 2);
    forceX /= forceMag;
    forceZ /= forceMag;

    if (currentSpeed < maxSpeed) {
      playerBody.applyForce(
        getTempVec3(forceX * moveForce, 0, forceZ * moveForce),
        playerBody.position
      );
    }
  }

  const camera = getCamera();
  camera.position.x = playerBody.position.x - Math.sin(cameraAngleX) * 20;
  camera.position.z = playerBody.position.z - Math.cos(cameraAngleX) * 20;
  camera.position.y = playerBody.position.y + 15 + Math.sin(cameraAngleY) * 10;
  camera.lookAt(playerBody.position.x, playerBody.position.y + 2, playerBody.position.z);

  syncPhysicsToGraphics(playerMesh, playerBody);

  currentTimeInLoop += deltaTime;
  if (currentTimeInLoop >= timeLoopDuration) {
    currentTimeInLoop = 0;
    if (onCreateEchoCallback && timeHistory.length > 0) {
      onCreateEchoCallback([...timeHistory]);
    }
    timeHistory = [];
  }

  const stateSnapshot = {
    position: {
      x: playerBody.position.x,
      y: playerBody.position.y,
      z: playerBody.position.z
    },
    quaternion: {
      x: playerBody.quaternion.x,
      y: playerBody.quaternion.y,
      z: playerBody.quaternion.z,
      w: playerBody.quaternion.w
    },
    velocity: {
      x: playerBody.velocity.x,
      y: playerBody.velocity.y,
      z: playerBody.velocity.z
    },
    actions: {
      fire: keys.fire
    },
    cameraAngle: {
      x: cameraAngleX,
      y: cameraAngleY
    }
  };

  timeHistory.push(stateSnapshot);
  if (timeHistory.length > maxHistoryFrames) {
    timeHistory.shift();
  }

  const now = performance.now();
  if (keys.fire && now - lastFireTime > fireCooldown) {
    lastFireTime = now;
    if (onFireCallback) {
      const fireDirection = new THREE.Vector3(
        Math.sin(cameraAngleX),
        -Math.sin(cameraAngleY),
        Math.cos(cameraAngleX)
      ).normalize();
      onFireCallback(playerMesh.position.clone(), fireDirection, 'player');
    }
  }

  if (keys.createEcho && now - lastEchoCreationTime > echoCreationCooldown && timeHistory.length > 30) {
    lastEchoCreationTime = now;
    if (onCreateEchoCallback) {
      onCreateEchoCallback([...timeHistory]);
    }
    timeHistory = [];
    currentTimeInLoop = 0;
  }
}

export function getPlayerMesh() {
  return playerMesh;
}

export function getPlayerBody() {
  return playerBody;
}

export function getPlayerPosition() {
  return playerMesh.position.clone();
}

export function getPlayerDirection() {
  return new THREE.Vector3(
    Math.sin(cameraAngleX),
    -Math.sin(cameraAngleY),
    Math.cos(cameraAngleX)
  ).normalize();
}

export function getHealth() {
  return health;
}

export function takeDamage(amount) {
  health -= amount;
  if (health <= 0) {
    health = 0;
    isDead = true;
  }
}

export function heal(amount) {
  health = Math.min(100, health + amount);
}

export function isPlayerDead() {
  return isDead;
}

export function resetPlayer() {
  health = 100;
  isDead = false;
  playerBody.position.set(0, 2, 0);
  playerBody.velocity.set(0, 0, 0);
  playerBody.angularVelocity.set(0, 0, 0);
  timeHistory = [];
  currentTimeInLoop = 0;
  cameraAngleX = 0;
  cameraAngleY = 0;
}

export function getTimeLoopProgress() {
  return (currentTimeInLoop / timeLoopDuration) * 100;
}

export function getTimeHistory() {
  return timeHistory;
}

export function cleanup() {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('mouseup', onMouseUp);
  if (playerMesh) {
    getScene().remove(playerMesh);
  }
  if (playerBody) {
    removeBody(playerBody);
  }
}
