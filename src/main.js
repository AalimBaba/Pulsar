import { initScene, render } from './scene.js';
import { initPhysics, stepPhysics } from './physics.js';
import { initPlayer, updatePlayer, getPlayerPosition, getPlayerDirection, getHealth, getTimeLoopProgress, takeDamage, isPlayerDead, resetPlayer, setOnFireCallback, setOnCreateEchoCallback, cleanup as cleanupPlayer } from './player.js';
import { createEcho, updateEchoes, getEchoCount, setOnEchoFireCallback, clearAllEchoes, cleanup as cleanupEchoes } from './echoes.js';
import { fireProjectile, updateProjectiles, setOnProjectileHitCallback, clearAllProjectiles, cleanup as cleanupWeapons } from './weapons.js';
import { createEnemy, updateEnemies, damageEnemy, getEnemyAtPosition, getEnemyCount, clearAllEnemies, setOnEnemyDeathCallback, cleanup as cleanupEnemies } from './enemies.js';
import { createLevel1, updateTriggers, updateSwitches, updateGates, updateObstacles, cleanup as cleanupObstacles } from './obstacles.js';
import { createExplosion, createTrail, updateParticles, renderTrails, clearAllParticles, cleanup as cleanupParticles } from './particles.js';
import { initHUD, updateHUD, showGameOver, hideGameOver, setOnRestartCallback, resetHUD, cleanup as cleanupHUD } from './hud.js';

let isRunning = false;
let lastTime = 0;
let score = 0;
let level = 1;

function handleProjectileHit(projectile, raycaster) {
  const enemy = getEnemyAtPosition(projectile.mesh.position, 2);
  if (enemy && projectile.source !== 'enemy') {
    damageEnemy(enemy, projectile.damage);
    createExplosion(projectile.mesh.position.clone(), 0x00ff88, 20, 3);
    return true;
  }

  if (projectile.source === 'enemy') {
    const playerPos = getPlayerPosition();
    const dist = playerPos.distanceTo(projectile.mesh.position);
    if (dist < 1.5) {
      takeDamage(10);
      createExplosion(projectile.mesh.position.clone(), 0xff4444, 15, 2);
      return true;
    }
  }

  return false;
}

function handleEnemyDeath(position) {
  createExplosion(position, 0xff4444, 40, 5);
  score += 100;
}

function handlePlayerFire(position, direction, source) {
  fireProjectile(position, direction, source);
  createTrail(position.clone(), 0x00ff88);
}

function handleEchoFire(position, direction, source) {
  fireProjectile(position, direction, source);
  createTrail(position.clone(), 0x00aaff);
}

function handleCreateEcho(historyData) {
  createEcho(historyData);
}

function handleRestart() {
  resetPlayer();
  clearAllEchoes();
  clearAllProjectiles();
  clearAllEnemies();
  clearAllParticles();
  resetHUD();
  score = 0;
  level = 1;
  hideGameOver();
  createLevel1();
  spawnEnemiesForLevel(level);
}

function spawnEnemiesForLevel(levelNum) {
  const enemyCount = Math.min(3 + levelNum * 2, 15);
  const areaSize = 30 + levelNum * 5;
  for (let i = 0; i < enemyCount; i++) {
    const x = (Math.random() - 0.5) * areaSize;
    const z = (Math.random() - 0.5) * areaSize;
    createEnemy(new THREE.Vector3(x, 2, z));
  }
}

function gameLoop(currentTime) {
  if (!isRunning) return;

  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  if (!isPlayerDead()) {
    updatePlayer(deltaTime);
  }

  stepPhysics();

  const echoes = [];
  updateEchoes(deltaTime);

  updateEnemies(deltaTime, getPlayerPosition(), echoes);
  updateProjectiles(deltaTime);
  updateTriggers(getPlayerPosition(), echoes);
  updateSwitches(getPlayerPosition(), echoes);
  updateGates();
  updateObstacles();

  updateParticles(deltaTime);
  renderTrails();

  if (getHealth() <= 0) {
    showGameOver();
  }

  updateHUD(
    level,
    getHealth(),
    getTimeLoopProgress(),
    getEchoCount(),
    score
  );

  if (getEnemyCount() === 0 && !isPlayerDead()) {
    level++;
    spawnEnemiesForLevel(level);
    score += 500;
  }

  render();

  requestAnimationFrame(gameLoop);
}

function init() {
  initScene();
  initPhysics();
  initPlayer();
  initHUD();

  setOnFireCallback(handlePlayerFire);
  setOnCreateEchoCallback(handleCreateEcho);
  setOnEchoFireCallback(handleEchoFire);
  setOnProjectileHitCallback(handleProjectileHit);
  setOnEnemyDeathCallback(handleEnemyDeath);
  setOnRestartCallback(handleRestart);

  createLevel1();
  spawnEnemiesForLevel(level);

  isRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function cleanup() {
  isRunning = false;
  cleanupPlayer();
  cleanupEchoes();
  cleanupWeapons();
  cleanupEnemies();
  cleanupObstacles();
  cleanupParticles();
  cleanupHUD();
}

init();
