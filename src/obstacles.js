import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getScene } from './scene.js';
import { addBody, removeBody, syncPhysicsToGraphics, createBoxBody } from './physics.js';

const obstacles = [];
const triggers = [];
const switches = [];
const gates = [];

let onTriggerActivatedCallback = null;
let onSwitchActivatedCallback = null;

export function setOnTriggerActivatedCallback(callback) {
  onTriggerActivatedCallback = callback;
}

export function setOnSwitchActivatedCallback(callback) {
  onSwitchActivatedCallback = callback;
}

export function createObstacle(position, size, type = 'static') {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshStandardMaterial({
    color: 0x444466,
    roughness: 0.7,
    metalness: 0.3
  });
  const obstacleMesh = new THREE.Mesh(geometry, material);
  obstacleMesh.position.copy(position);
  obstacleMesh.castShadow = true;
  obstacleMesh.receiveShadow = true;
  getScene().add(obstacleMesh);

  const mass = type === 'static' ? 0 : 10;
  const obstacleBody = createBoxBody(size.x, size.y, size.z, mass, position, null);
  addBody(obstacleBody);

  const obstacle = {
    mesh: obstacleMesh,
    body: obstacleBody,
    type: type,
    id: Date.now() + Math.random()
  };

  obstacles.push(obstacle);
  return obstacle;
}

export function createTrigger(position, size, triggerType) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0x444400,
    transparent: true,
    opacity: 0.3,
    roughness: 0.5,
    metalness: 0.5
  });
  const triggerMesh = new THREE.Mesh(geometry, material);
  triggerMesh.position.copy(position);
  getScene().add(triggerMesh);

  const trigger = {
    mesh: triggerMesh,
    position: position.clone(),
    size: size.clone(),
    type: triggerType,
    activated: false,
    activators: new Set(),
    requiredActivators: triggerType === 'dual' ? 2 : 1,
    id: Date.now() + Math.random()
  };

  triggers.push(trigger);
  return trigger;
}

export function createSwitch(position, switchId) {
  const geometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x004400,
    roughness: 0.3,
    metalness: 0.7
  });
  const switchMesh = new THREE.Mesh(geometry, material);
  switchMesh.position.copy(position);
  switchMesh.position.y = 0.15;
  switchMesh.castShadow = true;
  switchMesh.receiveShadow = true;
  getScene().add(switchMesh);

  const switchObj = {
    mesh: switchMesh,
    position: position.clone(),
    switchId: switchId,
    activated: false,
    id: Date.now() + Math.random()
  };

  switches.push(switchObj);
  return switchObj;
}

export function createGate(position, size, requiredSwitchId) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff8800,
    emissive: 0x442200,
    roughness: 0.4,
    metalness: 0.6,
    transparent: true,
    opacity: 0.8
  });
  const gateMesh = new THREE.Mesh(geometry, material);
  gateMesh.position.copy(position);
  gateMesh.castShadow = true;
  gateMesh.receiveShadow = true;
  getScene().add(gateMesh);

  const gateBody = createBoxBody(size.x, size.y, size.z, 0, position, null);
  addBody(gateBody);

  const gate = {
    mesh: gateMesh,
    body: gateBody,
    requiredSwitchId: requiredSwitchId,
    isOpen: false,
    id: Date.now() + Math.random()
  };

  gates.push(gate);
  return gate;
}

export function updateTriggers(playerPosition, echoes) {
  for (const trigger of triggers) {
    const activators = new Set();

    const playerDist = playerPosition.distanceTo(trigger.position);
    if (playerDist < Math.max(trigger.size.x, trigger.size.z) / 2 + 1) {
      activators.add('player');
    }

    for (const echo of echoes) {
      const echoDist = echo.mesh.position.distanceTo(trigger.position);
      if (echoDist < Math.max(trigger.size.x, trigger.size.z) / 2 + 1) {
        activators.add('echo-' + echo.id);
      }
    }

    trigger.activators = activators;
    const wasActivated = trigger.activated;
    trigger.activated = activators.size >= trigger.requiredActivators;

    if (trigger.activated && !wasActivated) {
      trigger.mesh.material.emissive.setHex(0x00ff00);
      trigger.mesh.material.color.setHex(0x00ff00);
      if (onTriggerActivatedCallback) {
        onTriggerActivatedCallback(trigger);
      }
    } else if (!trigger.activated && wasActivated) {
      trigger.mesh.material.emissive.setHex(0x444400);
      trigger.mesh.material.color.setHex(0xffff00);
    }
  }
}

export function updateSwitches(playerPosition, echoes) {
  for (const switchObj of switches) {
    const playerDist = playerPosition.distanceTo(switchObj.position);
    let isPressed = playerDist < 1.5;

    if (!isPressed) {
      for (const echo of echoes) {
        const echoDist = echo.mesh.position.distanceTo(switchObj.position);
        if (echoDist < 1.5) {
          isPressed = true;
          break;
        }
      }
    }

    const wasActivated = switchObj.activated;
    switchObj.activated = isPressed;

    if (switchObj.activated && !wasActivated) {
      switchObj.mesh.material.emissive.setHex(0x00ff00);
      switchObj.mesh.scale.y = 0.5;
      if (onSwitchActivatedCallback) {
        onSwitchActivatedCallback(switchObj);
      }
    } else if (!switchObj.activated && wasActivated) {
      switchObj.mesh.material.emissive.setHex(0x004400);
      switchObj.mesh.scale.y = 1;
    }
  }
}

export function updateGates() {
  for (const gate of gates) {
    const switchObj = switches.find(s => s.switchId === gate.requiredSwitchId);
    const shouldBeOpen = switchObj && switchObj.activated;

    if (shouldBeOpen && !gate.isOpen) {
      gate.isOpen = true;
      gate.mesh.visible = false;
      removeBody(gate.body);
    } else if (!shouldBeOpen && gate.isOpen) {
      gate.isOpen = false;
      gate.mesh.visible = true;
      addBody(gate.body);
    }
  }
}

export function updateObstacles() {
  for (const obstacle of obstacles) {
    if (obstacle.type !== 'static') {
      syncPhysicsToGraphics(obstacle.mesh, obstacle.body);
    }
  }
}

export function removeObstacle(index) {
  const obstacle = obstacles[index];
  if (!obstacle) return;

  getScene().remove(obstacle.mesh);
  removeBody(obstacle.body);
  obstacle.mesh.geometry.dispose();
  obstacle.mesh.material.dispose();
  obstacles.splice(index, 1);
}

export function removeTrigger(index) {
  const trigger = triggers[index];
  if (!trigger) return;

  getScene().remove(trigger.mesh);
  trigger.mesh.geometry.dispose();
  trigger.mesh.material.dispose();
  triggers.splice(index, 1);
}

export function removeSwitch(index) {
  const switchObj = switches[index];
  if (!switchObj) return;

  getScene().remove(switchObj.mesh);
  switchObj.mesh.geometry.dispose();
  switchObj.mesh.material.dispose();
  switches.splice(index, 1);
}

export function removeGate(index) {
  const gate = gates[index];
  if (!gate) return;

  getScene().remove(gate.mesh);
  if (!gate.isOpen) {
    removeBody(gate.body);
  }
  gate.mesh.geometry.dispose();
  gate.mesh.material.dispose();
  gates.splice(index, 1);
}

export function getObstacles() {
  return obstacles;
}

export function getTriggers() {
  return triggers;
}

export function getSwitches() {
  return switches;
}

export function getGates() {
  return gates;
}

export function clearAllObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    removeObstacle(i);
  }
}

export function clearAllTriggers() {
  for (let i = triggers.length - 1; i >= 0; i--) {
    removeTrigger(i);
  }
}

export function clearAllSwitches() {
  for (let i = switches.length - 1; i >= 0; i--) {
    removeSwitch(i);
  }
}

export function clearAllGates() {
  for (let i = gates.length - 1; i >= 0; i--) {
    removeGate(i);
  }
}

export function createLevel1() {
  createObstacle(new THREE.Vector3(-15, 2, 0), new THREE.Vector3(2, 4, 20), 'static');
  createObstacle(new THREE.Vector3(15, 2, 0), new THREE.Vector3(2, 4, 20), 'static');
  createObstacle(new THREE.Vector3(0, 2, -20), new THREE.Vector3(32, 4, 2), 'static');
  createObstacle(new THREE.Vector3(0, 2, 20), new THREE.Vector3(32, 4, 2), 'static');

  createSwitch(new THREE.Vector3(-10, 0, -10), 'gate1');
  createSwitch(new THREE.Vector3(10, 0, -10), 'gate2');
  createGate(new THREE.Vector3(0, 3, 0), new THREE.Vector3(2, 6, 2), 'gate1');
  createGate(new THREE.Vector3(0, 3, 10), new THREE.Vector3(2, 6, 2), 'gate2');

  createTrigger(new THREE.Vector3(0, 0, 15), new THREE.Vector3(5, 2, 5), 'single');
}

export function cleanup() {
  clearAllObstacles();
  clearAllTriggers();
  clearAllSwitches();
  clearAllGates();
}
