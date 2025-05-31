import * as THREE from 'three';

export function generateMaze(scene, size, wallSize) {
  const stripGeo = new THREE.BoxGeometry(wallSize, 0.07, 0.05);
  const stripMat = new THREE.MeshStandardMaterial({
    emissive: 0x00ffff,
    emissiveIntensity: 2,
    color: 0x000000,
    metalness: 1,
    roughness: 0.1
  });

  const maze = Array.from({ length: size }, () => Array(size).fill(1));
  const carve = (x, y) => {
    const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size && maze[ny][nx] === 1) {
        maze[ny][nx] = 0;
        maze[y + dy / 2][x + dx / 2] = 0;
        carve(nx, ny);
      }
    }
  };
  maze[1][1] = 0;
  carve(1, 1);

  // Randomly punch holes in walls to make alternate paths
  const holeCount = Math.floor(size * size * 0.05);
  for (let i = 0; i < holeCount; i++) {
    const x = Math.floor(Math.random() * size);
    const z = Math.floor(Math.random() * size);
    if (maze[z][x] === 1 && x > 1 && x < size - 2 && z > 1 && z < size - 2) {
      maze[z][x] = 0;
    }
  }

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 1,
    roughness: 0.2
  });
  const wallGeometry = new THREE.BoxGeometry(wallSize, 4, wallSize);
  const wallBoxes = [];

  const offsetX = -size * wallSize / 2 + wallSize / 2;
  const offsetZ = -size * wallSize / 2 + wallSize / 2;

  maze.forEach((row, z) => {
    row.forEach((cell, x) => {
      if (cell === 1) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x * wallSize + offsetX, 1, z * wallSize + offsetZ);
        addLEDStrips(wall, wallSize, maze, x, z, stripGeo, stripMat)
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        wall.updateMatrixWorld();
        wallBoxes.push(new THREE.Box3().setFromObject(wall));
      }
    });
  });

  return { layout: maze, offsetX, offsetZ, wallBoxes };
}

function addLEDStrips(wall, wallSize, maze, x, z, stripGeo, stripMat) {
  const strips = [];

  function isEmpty(x, z, maze) {
    return true;
    if (z < 0 || z >= maze.length || x < 0 || x >= maze[0].length) return true;
    return maze[z][x] === 0;
  }

  if (isEmpty(x, z - 1, maze)) {
    // front
    const top = new THREE.Mesh(stripGeo, stripMat);
    top.position.set(0, 1.95, wallSize / 2 + 0.01);
    const bot = new THREE.Mesh(stripGeo, stripMat);
    bot.position.set(0, -0.95, wallSize / 2 + 0.01);
    strips.push(top, bot);
  }
  if (isEmpty(x, z + 1, maze)) {
    // back
    const top = new THREE.Mesh(stripGeo, stripMat);
    top.position.set(0, 1.95, -wallSize / 2 - 0.01);
    const bot = new THREE.Mesh(stripGeo, stripMat);
    bot.position.set(0, -0.95, -wallSize / 2 - 0.01);
    strips.push(top, bot);
  }
  if (isEmpty(x - 1, z, maze)) {
    // left
    const top = new THREE.Mesh(stripGeo, stripMat);
    top.rotation.y = Math.PI / 2;
    top.position.set(-wallSize / 2 - 0.01, 1.95, 0);
    const bot = new THREE.Mesh(stripGeo, stripMat);
    bot.rotation.y = Math.PI / 2;
    bot.position.set(-wallSize / 2 - 0.01, -0.95, 0);
    strips.push(top, bot);
  }
  if (isEmpty(x + 1, z, maze)) {
    // right
    const top = new THREE.Mesh(stripGeo, stripMat);
    top.rotation.y = Math.PI / 2;
    top.position.set(wallSize / 2 + 0.01, 1.95, 0);
    const bot = new THREE.Mesh(stripGeo, stripMat);
    bot.rotation.y = Math.PI / 2;
    bot.position.set(wallSize / 2 + 0.01, -0.95, 0);
    strips.push(top, bot);
  }

  strips.forEach(strip => wall.add(strip));
}

