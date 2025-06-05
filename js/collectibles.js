import * as THREE from 'three';

let dots = [];
let time = 0;
let totalDots = 0;

export function spawnDots(scene, mazeLayout, wallSize, offsetX, offsetZ, amount) {
  const walkableTiles = [];

  mazeLayout.forEach((row, z) => {
    row.forEach((cell, x) => {
      if (cell === 0) {
        walkableTiles.push({ x, z });
      }
    });
  });

  const shuffled = walkableTiles.sort(() => Math.random() - 0.5).slice(0, amount);

  const dotGeo = new THREE.SphereGeometry(0.2, 16, 16);
  const dotMat = new THREE.MeshStandardMaterial({
    emissive: 0xffffff,
    emissiveIntensity: 5,
    color: 0x111111
  });

  dots = shuffled.map(({ x, z }) => {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x * wallSize + offsetX, 1.5, z * wallSize + offsetZ);
    dot.userData.baseY = dot.position.y;

    const light = new THREE.PointLight(0xffffff, 5, 6);
    light.position.copy(dot.position)
    light.castShadow = false;
    scene.add(dot);
    scene.add(light)

    return { mesh: dot, light };
  });

  totalDots = dots.length;
  updateDotCounter();
}

export function animateDots(deltaTime) {
  time += deltaTime;
  dots.forEach(({ mesh }) => {
    const baseY = mesh.userData.baseY - 0.3;
    mesh.position.y = baseY + Math.sin(time * 2 + mesh.position.x + mesh.position.z) * 0.2;
  });
}

export function checkDotCollection(player) {
  const distanceThreshold = 2;

  let collected = 0;
  dots = dots.filter(({ mesh, light }) => {
    const distance = mesh.position.distanceTo(player.position);
    if (distance < distanceThreshold) {
      mesh.visible = false;
      light.visible = false;
      collected++;
      return false;
    }
    return true;
  });

  if (collected > 0) updateDotCounter();
  return dots.length === 0;
}

function updateDotCounter() {
  const counter = document.getElementById('dotCounter');
  if (counter) {
    counter.textContent = `Dots: ${totalDots - dots.length} / ${totalDots}`;
  }
}
