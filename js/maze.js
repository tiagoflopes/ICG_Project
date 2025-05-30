import * as THREE from 'three';

export function generateMaze(scene, size, wallSize) {
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

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const wallGeometry = new THREE.BoxGeometry(wallSize, 4, wallSize);
  const wallBoxes = [];

  const offsetX = -size * wallSize / 2 + wallSize / 2;
  const offsetZ = -size * wallSize / 2 + wallSize / 2;

  maze.forEach((row, z) => {
    row.forEach((cell, x) => {
      if (cell === 1) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x * wallSize + offsetX, 1, z * wallSize + offsetZ);
        scene.add(wall);
        wall.updateMatrixWorld();
        wallBoxes.push(new THREE.Box3().setFromObject(wall));
      }
    });
  });

  return { layout: maze, offsetX, offsetZ, wallBoxes };
}
