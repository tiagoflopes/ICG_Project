import * as THREE from 'three';

const baseSpeed = 0.05;

export function createPlayer(scene, x, z) {
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const player = new THREE.Mesh(geometry, material);
  player.position.set(x, 1, z);
  scene.add(player);

  const lantern = new THREE.SpotLight(0xffffff, 5, 20, Math.PI / 6, 0.3, 1);
  lantern.castShadow = true;
  lantern.shadow.mapSize.set(512, 512);
  scene.add(lantern);
  scene.add(lantern.target);

  player.userData.lantern = lantern;

  return player;
}

export function updatePlayerPosition(player, camera, moveState, wallBoxes) {
  if (window.disableMovement) return;

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
  camera.parent.position.set(
    player.position.x,
    player.position.y,
    player.position.z
  );

  const lantern = player.userData.lantern;
  if (lantern) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    lantern.position.copy(player.position).y += 0.5;
    lantern.target.position.copy(player.position.clone().add(dir.multiplyScalar(5)));
  }
}
