import * as THREE from 'three';

let dots = [];
let time = 0;

export function spawnDots(scene, mazeLayout, wallSize, offsetX, offsetZ, amount = 20) {
  const walkableTiles = [];

  mazeLayout.forEach((row, z) => {
    row.forEach((cell, x) => {
      if (cell === 0) {
        walkableTiles.push({ x, z });
      }
    });
  });

  const shuffled = walkableTiles.sort(() => Math.random() - 0.5).slice(0, amount);

  const geometry = new THREE.SphereGeometry(0.2, 16, 16);
  const material = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });

  dots = shuffled.map(({ x, z }) => {
    const dot = new THREE.Mesh(geometry, material.clone());
    dot.position.set(x * wallSize + offsetX, 1.5, z * wallSize + offsetZ);
    dot.userData.baseY = dot.position.y;
    scene.add(dot);
    return dot;
  });
}

export function animateDots(deltaTime) {
  time += deltaTime;
  dots.forEach(dot => {
    const baseY = dot.userData.baseY - 0.3;
    dot.position.y = baseY + Math.sin(time * 2 + dot.position.x + dot.position.z) * 0.2;
  });
}

export function checkDotCollection(player, scene) {
  const distanceThreshold = 2;

  dots = dots.filter(dot => {
    const distance = dot.position.distanceTo(player.position);
    if (distance < distanceThreshold) {
      scene.remove(dot);
      return false;
    }
    return true;
  });

  return dots.length === 0;
}
