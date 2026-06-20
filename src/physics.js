import * as CANNON from 'cannon-es';

let world;
const fixedTimeStep = 1 / 60;
const maxSubSteps = 3;
let lastCallTime;

export function initPhysics() {
  world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.solver.iterations = 10;
  world.defaultContactMaterial.contactEquationStiffness = 1e7;
  world.defaultContactMaterial.contactEquationRelaxation = 3;

  const groundMaterial = new CANNON.Material('ground');
  const playerMaterial = new CANNON.Material('player');
  const obstacleMaterial = new CANNON.Material('obstacle');

  const groundPlayerContact = new CANNON.ContactMaterial(groundMaterial, playerMaterial, {
    friction: 0.5,
    restitution: 0.3
  });
  const playerObstacleContact = new CANNON.ContactMaterial(playerMaterial, obstacleMaterial, {
    friction: 0.3,
    restitution: 0.5
  });
  const groundObstacleContact = new CANNON.ContactMaterial(groundMaterial, obstacleMaterial, {
    friction: 0.6,
    restitution: 0.2
  });

  world.addContactMaterial(groundPlayerContact);
  world.addContactMaterial(playerObstacleContact);
  world.addContactMaterial(groundObstacleContact);

  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({
    mass: 0,
    shape: groundShape,
    material: groundMaterial
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  lastCallTime = performance.now() / 1000;
}

export function stepPhysics() {
  const time = performance.now() / 1000;
  const dt = time - lastCallTime;
  lastCallTime = time;
  world.step(fixedTimeStep, dt, maxSubSteps);
}

export function getWorld() {
  return world;
}

export function addBody(body) {
  world.addBody(body);
}

export function removeBody(body) {
  world.removeBody(body);
}

export function syncPhysicsToGraphics(mesh, body) {
  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);
}

const tempVec3 = new CANNON.Vec3();
const tempQuat = new CANNON.Quaternion();

export function getTempVec3(x = 0, y = 0, z = 0) {
  tempVec3.set(x, y, z);
  return tempVec3;
}

export function getTempQuat(x = 0, y = 0, z = 0, w = 1) {
  tempQuat.set(x, y, z, w);
  return tempQuat;
}

export function createBoxBody(width, height, depth, mass, position, material) {
  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const body = new CANNON.Body({
    mass: mass,
    shape: shape,
    position: new CANNON.Vec3(position.x, position.y, position.z),
    material: material
  });
  return body;
}

export function createSphereBody(radius, mass, position, material) {
  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({
    mass: mass,
    shape: shape,
    position: new CANNON.Vec3(position.x, position.y, position.z),
    material: material
  });
  return body;
}

export function createCylinderBody(radiusTop, radiusBottom, height, mass, position, material) {
  const shape = new CANNON.Cylinder(radiusTop, radiusBottom, height, 16);
  const body = new CANNON.Body({
    mass: mass,
    shape: shape,
    position: new CANNON.Vec3(position.x, position.y, position.z),
    material: material
  });
  return body;
}
