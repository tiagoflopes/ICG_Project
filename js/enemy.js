import * as THREE from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';

let enemy, mixer, walkAction, runAction;
let clock = new THREE.Clock();
let mazeLayout, offsetX, offsetZ, wallSize;
let state = 'WALK'; // 'WALK' or 'CHASE'
let targetTile = null;

export function getEnemyState() {
  return state;
}

export function loadEnemy(scene, maze, _offsetX, _offsetZ, _wallSize) {
  mazeLayout = maze;
  offsetX = _offsetX;
  offsetZ = _offsetZ;
  wallSize = _wallSize;

  const tileX = maze[0].length - 2;
  const tileZ = maze.length - 2;
  const posX = tileX * wallSize + offsetX;
  const posZ = tileZ * wallSize + offsetZ;

  const loader = new FBXLoader();

  loader.load('models/walking.fbx', (model) => {
    enemy = model;
    enemy.scale.set(0.002, 0.002, 0.002);
    enemy.position.set(posX, 0, posZ);
    enemy.userData.tile = { x: tileX, z: tileZ };
    enemy.userData.direction = { x: -1, z: 0 }; // Start going left
    scene.add(enemy);

    mixer = new THREE.AnimationMixer(enemy);
    walkAction = mixer.clipAction(model.animations[0]);
    walkAction.play();

    // preload run anim
    loader.load('models/running.fbx', (runModel) => {
      runAction = mixer.clipAction(runModel.animations[0]);
    });
  });
}

export function updateEnemy(player, scene) {
  if (!enemy || !mixer) return;

  mixer.update(clock.getDelta());

  const playerTile = worldToTile(player.position);
  const enemyTile = worldToTile(enemy.position);

  if (state === 'WALK' && canSeePlayer(enemyTile, playerTile)) {
    state = 'CHASE';
    if (runAction) {
      walkAction.stop();
      runAction.play();
    }
    // TODO: trigger sound/lights/etc here
    console.log("👁️ Enemy sees you!");
  }

  const speed = state === 'WALK' ? 0.02 : 0.06;

  if (state === 'CHASE') {
    const dir = new THREE.Vector3().subVectors(player.position, enemy.position);
    dir.y = 0;
    dir.normalize();

    const moveDelta = dir.multiplyScalar(speed);
    const tryPos = enemy.position.clone().add(moveDelta);
    const tempBox = new THREE.Box3().setFromCenterAndSize(tryPos, new THREE.Vector3(1, 2, 1));

    if (!checkCollision(tempBox)) {
      enemy.position.copy(tryPos);
      rotateEnemyTowards(dir)
    }

    // collision with player = game over
    const playerBox = new THREE.Box3().setFromObject(player);
    const enemyBox = new THREE.Box3().setFromObject(enemy);
    if (enemyBox.intersectsBox(playerBox)) {
      console.log("💀 GAME OVER 💀");
      // TODO: game over logic
    }

    return;
  }

  // --- Random WALK mode ---
  if (!targetTile || reachedTarget(enemy.position, targetTile)) {
    const directions = shuffle([
      { x: 0, z: -1 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -1, z: 0 },
    ]);

    for (const dir of directions) {
      const nx = enemyTile.x + dir.x;
      const nz = enemyTile.z + dir.z;
      if (
        mazeLayout[nz] && mazeLayout[nz][nx] === 0 &&
        !checkCollision(new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(nx * wallSize + offsetX, 0, nz * wallSize + offsetZ),
          new THREE.Vector3(1, 2, 1)
        ))
      ) {
        targetTile = {
          x: nx,
          z: nz,
          worldPos: new THREE.Vector3(nx * wallSize + offsetX, 0, nz * wallSize + offsetZ),
        };
        break;
      }
    }
  }

  if (targetTile) {
    const moveDir = new THREE.Vector3().subVectors(targetTile.worldPos, enemy.position).normalize();
    const moveDelta = moveDir.multiplyScalar(speed);
    const tryPos = enemy.position.clone().add(moveDelta);
    const tempBox = new THREE.Box3().setFromCenterAndSize(tryPos, new THREE.Vector3(1, 2, 1));

    if (!checkCollision(tempBox)) {
      enemy.position.copy(tryPos);
      rotateEnemyTowards(moveDir)
    } else {
      targetTile = null; // pick another route
    }
  }
}

function worldToTile(pos) {
  return {
    x: Math.round((pos.x - offsetX) / wallSize),
    z: Math.round((pos.z - offsetZ) / wallSize)
  };
}

function reachedTarget(pos, tile) {
  return pos.distanceTo(tile.worldPos) < 0.3;
}

function canSeePlayer(enemyTile, playerTile) {
  if (enemyTile.x === playerTile.x) {
    const x = enemyTile.x;
    const [z1, z2] = [enemyTile.z, playerTile.z].sort((a, b) => a - b);
    for (let z = z1 + 1; z < z2; z++) {
      if (mazeLayout[z][x] !== 0) return false;
    }
    return true;
  }

  if (enemyTile.z === playerTile.z) {
    const z = enemyTile.z;
    const [x1, x2] = [enemyTile.x, playerTile.x].sort((a, b) => a - b);
    for (let x = x1 + 1; x < x2; x++) {
      if (mazeLayout[z][x] !== 0) return false;
    }
    return true;
  }

  return false;
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function checkCollision(box) {
  return window.wallBoxes && window.wallBoxes.some(wallBox => box.intersectsBox(wallBox));
}

function rotateEnemyTowards(dir) {
  enemy.rotation.y = Math.atan2(dir.x, dir.z);
}
