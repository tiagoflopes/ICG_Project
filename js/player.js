import * as THREE from 'three';

const baseSpeed = 0.1;

export function createPlayer(scene, x, z) {
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const player = new THREE.Mesh(geometry, material);
  player.position.set(x, 1, z);
  scene.add(player);
  return player;
}

export function updatePlayerPosition(player, camera, moveState, wallBoxes) {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0;
  direction.normalize();

  const sideways = new THREE.Vector3();
  sideways.crossVectors(camera.up, direction).normalize();

  const speed = moveState.run ? baseSpeed * 2 : baseSpeed;

  const moveDelta = new THREE.Vector3();
  if (moveState.forward) moveDelta.addScaledVector(direction, speed);
  if (moveState.backward) moveDelta.addScaledVector(direction, -speed);
  if (moveState.left) moveDelta.addScaledVector(sideways, speed);
  if (moveState.right) moveDelta.addScaledVector(sideways, -speed);

  let nextPos = player.position.clone();
  let tempBox = new THREE.Box3();

  let tryX = player.position.clone(); tryX.x += moveDelta.x;
  tempBox.setFromCenterAndSize(tryX, new THREE.Vector3(1, 2, 1));
  const xBlocked = wallBoxes.some(box => tempBox.intersectsBox(box));

  let tryZ = player.position.clone(); tryZ.z += moveDelta.z;
  tempBox.setFromCenterAndSize(tryZ, new THREE.Vector3(1, 2, 1));
  const zBlocked = wallBoxes.some(box => tempBox.intersectsBox(box));

  if (!xBlocked) nextPos.x += moveDelta.x;
  if (!zBlocked) nextPos.z += moveDelta.z;

  player.position.copy(nextPos);
  camera.position.set(player.position.x, player.position.y + 0.6, player.position.z);
}
