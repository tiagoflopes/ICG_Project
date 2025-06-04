import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { generateMaze, stripMat } from './maze';
import { createPlayer, updatePlayerPosition } from './player';
import { setupControls, handleKeyDown, handleKeyUp } from './controls';
import { spawnDots, animateDots, checkDotCollection } from "./collectibles";
import { loadEnemy, updateEnemy, getEnemyState } from "./enemy";
import { initStartScene, disposeStartScene } from "./startScene";

let scene, camera, renderer = [];
let player;
let clock = new THREE.Clock();
let wasChasing = false;
let cameraRig;
const wallSize = 4;
const mazeSize = 21;

const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  run: false
};

initStartScene();

document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startMenu').style.display = 'none';
  document.getElementById('dotCounter').style.display = 'block';
  disposeStartScene();
  init();
});

document.getElementById('helpBtn').addEventListener('click', () => {
  const help = document.getElementById('helpText');
  help.style.display = help.style.display === 'none' ? 'block' : 'none';
});

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const controls = new PointerLockControls(camera, document.body);
  document.body.addEventListener('click', () => controls.lock());

  scene.fog = new THREE.Fog(0x000000, 5, 30)

  const { layout, offsetX, offsetZ, wallBoxes: boxes } = generateMaze(scene, mazeSize, wallSize);
  window.wallBoxes = boxes;

  const groundSize = mazeSize * wallSize;

  const textureLoader = new THREE.TextureLoader();
  const floorTex = textureLoader.load('assets/metal_plate_diff_1k.jpg');
  const floorMetal = textureLoader.load('assets/metal_plate_metal_1k.jpg');
  const floorAo = textureLoader.load('assets/metal_plate_ao_1k.jpg');
  const floorRough = textureLoader.load('assets/metal_plate_rough_1k.jpg');
  const floorNormal = textureLoader.load('assets/metal_plate_nor_gl_1k.jpg');

  floorTex.wrapS = floorTex.wrapT =
  floorRough.wrapS = floorRough.wrapT =
  floorMetal.wrapS = floorAo.wrapT =
  floorNormal.wrapS = floorNormal.wrapT = THREE.RepeatWrapping;

  floorTex.repeat.set(20, 20);
  floorMetal.repeat.set(20, 20);
  floorAo.repeat.set(20, 20);
  floorRough.repeat.set(20, 20);
  floorNormal.repeat.set(20, 20);

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: floorTex,
    metalnessMap: floorMetal,
    aoMap: floorAo,
    roughnessMap: floorRough,
    normalMap: floorNormal,
    metalness: 1,
    roughness: 0.1,
    color: 0x111111
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMaterial);
  ceiling.rotation.x = Math.PI / 2; // flip upward
  ceiling.position.y = 3;
  scene.add(ceiling);

  spawnDots(scene, layout, wallSize, offsetX, offsetZ, 30);

  loadEnemy(scene, layout, offsetX, offsetZ, wallSize);

  const startX = 1 * wallSize + offsetX;
  const startZ = 1 * wallSize + offsetZ;

  player = createPlayer(scene, startX, startZ);
  cameraRig = new THREE.Object3D();
  camera.position.set(0, 0.6, 0);
  cameraRig.add(camera);
  cameraRig.position.set(startX, 0.6, startZ);
  cameraRig.rotation.set(0, 0, 0)
  scene.add(cameraRig)

  setupControls(moveState, handleKeyDown, handleKeyUp);

  animate();
}

// TODO: add main page, remove dots overlay, tung tung movement

function applyChaseEffects(time) {
  // Flickering red
  const flicker = (Math.sin(time * 20) + 1) / 2;
  const red = new THREE.Color().lerpColors(
    new THREE.Color(0x440000),
    new THREE.Color(0xff0000),
    flicker
  );
  stripMat.emissive.set(red);

  // Camera tilt
  cameraRig.rotation.z = Math.sin(time * 8) * 0.05;
}

function resetChaseEffects() {
  stripMat.emissive.set(0x00ffff); // restore original color
  cameraRig.rotation.z = 0; // restore upright view
}

function animate() {
  const delta = clock.getDelta();
  animateDots(delta);

  requestAnimationFrame(animate);

  updateEnemy(player, scene);
  updatePlayerPosition(player, camera, moveState, window.wallBoxes);

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);

  const enemyState = getEnemyState();
  const time = clock.getElapsedTime();

  if (enemyState === 'CHASE') {
    applyChaseEffects(time);
    wasChasing = true;
  } else if (wasChasing) {
    resetChaseEffects();
    wasChasing = false;
  }

  const gameWon = checkDotCollection(player, scene);
  if (gameWon) {
    if (!window.hasWon) {
      window.hasWon = true;
      document.getElementById('youWon').style.display = 'block';
      window.disableMovement = true;

      setTimeout(() => location.reload(), 5000);
    }
  }
}
