import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getScene } from './scene.js';
import { addBody, removeBody, syncPhysicsToGraphics, createSphereBody } from './physics.js';

const echoes = [];
let onEchoFireCallback = null;

export function setOnEchoFireCallback(callback) {
  onEchoFireCallback = callback;
}

export function createEcho(historyData) {
  if (!historyData || historyData.length === 0) return null;

  const geometry = new THREE.ConeGeometry(0.8, 2, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    emissive: 0x002244,
    roughness: 0.3,
    metalness: 0.7,
    transparent: true,
    opacity: 0.7
  });
  const echoMesh = new THREE.Mesh(geometry, material);
  echoMesh.castShadow = true;
  echoMesh.receiveShadow = true;
  getScene().add(echoMesh);

  const echoBody = createSphereBody(0.8, 5, { x: 0, y: 2, z: 0 }, null);
  echoBody.linearDamping = 0.5;
  echoBody.angularDamping = 0.5;
  echoBody.fixedRotation = true;
  addBody(echoBody);

  const echo = {
    mesh: echoMesh,
    body: echoBody,
    history: historyData,
    currentFrame: 0,
    isPlaying: true,
    loopCount: 0,
    maxLoops: 3,
    id: Date.now() + Math.random()
  };

  if (historyData.length > 0) {
    const firstFrame = historyData[0];
    echoBody.position.set(firstFrame.position.x, firstFrame.position.y, firstFrame.position.z);
    echoBody.quaternion.set(firstFrame.quaternion.x, firstFrame.quaternion.y, firstFrame.quaternion.z, firstFrame.quaternion.w);
    echoMesh.position.copy(echoBody.position);
    echoMesh.quaternion.copy(echoBody.quaternion);
  }

  echoes.push(echo);
  return echo;
}

export function updateEchoes(deltaTime) {
  const frameTime = 1 / 60;
  const framesToAdvance = Math.floor(deltaTime / frameTime);

  for (let i = echoes.length - 1; i >= 0; i--) {
    const echo = echoes[i];

    if (!echo.isPlaying) continue;

    for (let f = 0; f < framesToAdvance; f++) {
      if (echo.currentFrame >= echo.history.length) {
        echo.currentFrame = 0;
        echo.loopCount++;

        if (echo.loopCount >= echo.maxLoops) {
          removeEcho(i);
          continue;
        }
      }

      const frame = echo.history[echo.currentFrame];
      if (frame) {
        echo.body.position.set(frame.position.x, frame.position.y, frame.position.z);
        echo.body.quaternion.set(frame.quaternion.x, frame.quaternion.y, frame.quaternion.z, frame.quaternion.w);
        echo.body.velocity.set(frame.velocity.x, frame.velocity.y, frame.velocity.z);

        if (frame.actions && frame.actions.fire && onEchoFireCallback) {
          const fireDirection = new THREE.Vector3(
            Math.sin(frame.cameraAngle.x),
            -Math.sin(frame.cameraAngle.y),
            Math.cos(frame.cameraAngle.x)
          ).normalize();
          onEchoFireCallback(echo.mesh.position.clone(), fireDirection, 'echo');
        }
      }

      echo.currentFrame++;
    }

    syncPhysicsToGraphics(echo.mesh, echo.body);
  }
}

export function removeEcho(index) {
  const echo = echoes[index];
  if (!echo) return;

  getScene().remove(echo.mesh);
  removeBody(echo.body);
  echo.mesh.geometry.dispose();
  echo.mesh.material.dispose();
  echoes.splice(index, 1);
}

export function getEchoes() {
  return echoes;
}

export function getEchoCount() {
  return echoes.length;
}

export function clearAllEchoes() {
  for (let i = echoes.length - 1; i >= 0; i--) {
    removeEcho(i);
  }
}

export function getEchoAtPosition(position, radius) {
  for (const echo of echoes) {
    const distance = echo.mesh.position.distanceTo(position);
    if (distance < radius) {
      return echo;
    }
  }
  return null;
}

export function cleanup() {
  clearAllEchoes();
}
