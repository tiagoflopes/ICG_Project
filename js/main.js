import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { generateMaze } from './maze.js';
import { createPlayer, updatePlayerPosition } from './player.js';
import { setupControls, handleKeyDown, handleKeyUp } from './controls.js';
import { setupMinimap, renderMinimap } from './minimap.js';
import { spawnDots, animateDots, checkDotCollection } from "./collectibles";

let scene, camera, renderer, player, wallBoxes = [], minimapCamera;
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
  document.body.appendChild(renderer.domElement);

  const controls = new PointerLockControls(camera, document.body);
  document.body.addEventListener('click', () => controls.lock());

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  const { layout, offsetX, offsetZ, wallBoxes: boxes } = generateMaze(scene, mazeSize, wallSize);
  wallBoxes = boxes;

  const groundSize = mazeSize * wallSize;
  const groundTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(25, 25);

  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  spawnDots(scene, layout, wallSize, offsetX, offsetZ, 30);

  const startX = 1 * wallSize + offsetX;
  const startZ = 1 * wallSize + offsetZ;

  player = createPlayer(scene, startX, startZ);
  camera.position.set(startX, 1.6, startZ);

  minimapCamera = setupMinimap(mazeSize, wallSize);

  setupControls(moveState, handleKeyDown, handleKeyUp);

  animate();
}

function animate() {
  const delta = clock.getDelta();
  animateDots(delta);

  requestAnimationFrame(animate);

  updatePlayerPosition(player, camera, moveState, wallBoxes);

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);

  renderMinimap(renderer, scene, minimapCamera);

  const gameWon = checkDotCollection(player, scene);
  if (gameWon) {
    console.log("You won.")
  }
}

init();
