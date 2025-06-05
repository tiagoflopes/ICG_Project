import * as THREE from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';

let enemy, mixer, walkAction, runAction;
let clock = new THREE.Clock();
let mazeLayout, offsetX, offsetZ, wallSize;
let state = 'WALK'; // 'WALK' or 'CHASE'
let targetTile = null;
let lastSeenTime = null;
let gameOverTriggered = false;
let pathToPlayer = [];

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

  loader.load('assets/walking.fbx', (model) => {
    enemy = model;
    enemy.scale.set(0.002, 0.002, 0.002);
    enemy.position.set(posX, 0, posZ);
    enemy.userData.tile = { x: tileX, z: tileZ };
    enemy.userData.direction = { x: -1, z: 0 };
    scene.add(enemy);

    mixer = new THREE.AnimationMixer(enemy);
    const walkClip = removeRootMotion(model.animations[0]);
    walkAction = mixer.clipAction(walkClip);
    walkAction.play();

    loader.load('assets/running.fbx', (runModel) => {
      const runClip = removeRootMotion(runModel.animations[0]);
      runAction = mixer.clipAction(runClip);
    });

    const glow = new THREE.PointLight(0xff4444, 0.8, 3, 2);
    glow.castShadow = false;
    enemy.add(glow);
    glow.position.set(0, 2, 0)
  });
}

export function updateEnemy(player) {
  if (!enemy || !mixer) return;

  mixer.update(clock.getDelta());

  const playerTile = worldToTile(player.position);
  const enemyTile = worldToTile(enemy.position);

  if (state === 'CHASE' && lastSeenTime && performance.now() - lastSeenTime > 10000) {
    state = 'WALK';
    targetTile = null;
    if (walkAction) {
      runAction?.stop();
      walkAction.play();
    }
  }

  if (state === 'WALK' && canSeePlayer(enemyTile, playerTile)) {
    state = 'CHASE';
    lastSeenTime = performance.now();
    if (runAction) {
      walkAction.stop();
      runAction.play();
    }
  }

  const speed = state === 'WALK' ? 0.02 : 0.06;

  if (state === 'CHASE') {
    if (canSeePlayer(enemyTile, playerTile)) {
      lastSeenTime = performance.now();

      if (pathToPlayer.length === 0 || !pathToPlayer[pathToPlayer.length - 1] ||
        pathToPlayer[pathToPlayer.length - 1].x !== playerTile.x ||
        pathToPlayer[pathToPlayer.length - 1].z !== playerTile.z) {
        pathToPlayer = findPathAStar(enemyTile, playerTile, mazeLayout);
      }
    }

    if (pathToPlayer.length > 0) {
      const nextStep = pathToPlayer[0];
      const targetPos = new THREE.Vector3(
        nextStep.x * wallSize + offsetX,
        0,
        nextStep.z * wallSize + offsetZ
      );

      const dir = new THREE.Vector3().subVectors(targetPos, enemy.position);
      dir.y = 0;
      const distance = dir.length();

      if (distance < 0.1) {
        pathToPlayer.shift();
      } else {
        dir.normalize();
        const steps = 3;
        const moveStep = dir.clone().multiplyScalar(speed / steps);
        let nextPos = enemy.position.clone();

        for (let i = 0; i < steps; i++) {
          const tryPos = nextPos.clone().add(moveStep);
          const tempBox = new THREE.Box3().setFromCenterAndSize(tryPos, new THREE.Vector3(1, 2, 1));

          if (checkCollision(tempBox)) break;
          nextPos.copy(tryPos);
        }

        enemy.position.copy(nextPos);
        rotateEnemyTowards(dir);
      }
    }

    const playerBox = new THREE.Box3().setFromObject(player);
    const enemyBox = new THREE.Box3().setFromObject(enemy);
    if (!gameOverTriggered && enemyBox.intersectsBox(playerBox)) {
      gameOverTriggered = true;
      document.getElementById('gameOver').style.display = 'block';
      window.disableMovement = true;
      setTimeout(() => location.reload(), 3000);
    }

    return;
  }

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
      targetTile = null;
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

export function removeRootMotion(clip) {
  clip.tracks = clip.tracks.filter(track => !track.name.endsWith('.position'));
  return clip;
}

function findPathAStar(start, goal, maze) {
  const sizeZ = maze.length;
  const sizeX = maze[0].length;

  const key = (x, z) => `${x},${z}`;
  const parseKey = str => str.split(',').map(Number);

  const openSet = new Set([key(start.x, start.z)]);
  const cameFrom = {};

  const gScore = { [key(start.x, start.z)]: 0 };
  const fScore = { [key(start.x, start.z)]: heuristic(start, goal) };

  function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  }

  const getNeighbors = (x, z) => {
    return [
      { x: x + 1, z }, { x: x - 1, z },
      { x, z: z + 1 }, { x, z: z - 1 },
    ].filter(n => n.x >= 0 && n.x < sizeX && n.z >= 0 && n.z < sizeZ && maze[n.z][n.x] === 0);
  };

  while (openSet.size) {
    let current = [...openSet].reduce((lowest, node) => {
      return fScore[node] < fScore[lowest] ? node : lowest;
    });

    const [cx, cz] = parseKey(current);
    if (cx === goal.x && cz === goal.z) {
      const path = [];
      while (current in cameFrom) {
        const [x, z] = parseKey(current);
        path.unshift({ x, z });
        current = cameFrom[current];
      }
      return path;
    }

    openSet.delete(current);

    for (const neighbor of getNeighbors(cx, cz)) {
      const nKey = key(neighbor.x, neighbor.z);
      const tentativeG = gScore[current] + 1;

      if (!(nKey in gScore) || tentativeG < gScore[nKey]) {
        cameFrom[nKey] = current;
        gScore[nKey] = tentativeG;
        fScore[nKey] = tentativeG + heuristic(neighbor, goal);
        openSet.add(nKey);
      }
    }
  }

  return [];
}
