import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { generateMaze } from './maze';
import { createPlayer, updatePlayerPosition } from './player';
import { setupControls, handleKeyDown, handleKeyUp } from './controls';
import { spawnDots, animateDots, checkDotCollection } from "./collectibles";
import { loadEnemy, updateEnemy, getEnemyState } from "./enemy";

let scene, camera, renderer = [];
let player;
let clock = new THREE.Clock();
const wallSize = 4;
const mazeSize = 21;

const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  run: false
};

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

  scene.add(new THREE.AmbientLight(0xffffff, 0.03));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);
  scene.fog = new THREE.Fog(0x000000, 5, 30)

  const { layout, offsetX, offsetZ, wallBoxes: boxes } = generateMaze(scene, mazeSize, wallSize);
  window.wallBoxes = boxes;

  const groundSize = mazeSize * wallSize;

  const textureLoader = new THREE.TextureLoader();
  const floorTex = textureLoader.load('https://threejs.org/examples/textures/metal/Metal_Plate_016_basecolor.jpg');
  const floorRough = textureLoader.load('https://threejs.org/examples/textures/metal/Metal_Plate_016_roughness.jpg');
  const floorNormal = textureLoader.load('https://threejs.org/examples/textures/metal/Metal_Plate_016_normal.jpg');

  floorTex.wrapS = floorTex.wrapT =
  floorRough.wrapS = floorRough.wrapT =
  floorNormal.wrapS = floorNormal.wrapT = THREE.RepeatWrapping;

  floorTex.repeat.set(20, 20);
  floorRough.repeat.set(20, 20);
  floorNormal.repeat.set(20, 20);

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughnessMap: floorRough,
    normalMap: floorNormal,
    metalness: 1,
    roughness: 0.2,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMaterial);
  ceiling.rotation.x = Math.PI / 2; // flip upward
  ceiling.position.y = 3;
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  spawnDots(scene, layout, wallSize, offsetX, offsetZ, 30);

  loadEnemy(scene, layout, offsetX, offsetZ, wallSize);

  const startX = 1 * wallSize + offsetX;
  const startZ = 1 * wallSize + offsetZ;

  player = createPlayer(scene, startX, startZ);
  camera.position.set(startX, 1.6, startZ);

  setupControls(moveState, handleKeyDown, handleKeyUp);

  animate();
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

  if (getEnemyState() === 'CHASE') {

  }

  const gameWon = checkDotCollection(player, scene);
  if (gameWon) {
    console.log("You won.")
  }
}

init();
