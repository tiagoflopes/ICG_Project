import * as THREE from 'three';

export function setupMinimap(mazeSize, wallSize) {
  const mapSize = mazeSize * wallSize;
  const cam = new THREE.OrthographicCamera(
    -mapSize / 2, mapSize / 2,
    mapSize / 2, -mapSize / 2,
    0.1, 100
  );
  cam.position.set(0, 50, 0);
  cam.lookAt(0, 0, 0);
  return cam;
}

export function renderMinimap(renderer, scene, minimapCamera) {
  const w = 200, h = 200;
  renderer.setViewport(window.innerWidth - w - 10, window.innerHeight - h - 10, w, h);
  renderer.setScissor(window.innerWidth - w - 10, window.innerHeight - h - 10, w, h);
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, minimapCamera);
}
