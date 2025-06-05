import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { removeRootMotion } from "./enemy";

let scene, camera, renderer, enemy, mixer, clock, running = false;
let direction = 1;

export function initStartScene() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 5);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.PointLight(0xffffff, 1, 20);
  light.position.set(0, 3, 5);
  scene.add(light);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1, roughness: 0.2 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.2), wallMat);
  wall.position.z = -1;
  scene.add(wall);

  const stripMat = new THREE.MeshStandardMaterial({ emissive: 0x00ffff, color: 0x000000 });
  const topStrip = new THREE.Mesh(new THREE.BoxGeometry(8, 0.05, 0.1), stripMat);
  const bottomStrip = topStrip.clone();

  topStrip.position.set(0, 1.95, -0.89);
  bottomStrip.position.set(0, -1.95, -0.89);
  scene.add(topStrip, bottomStrip);

  const loader = new FBXLoader();
  loader.load('assets/walking.fbx', (model) => {
    enemy = model;
    enemy.scale.set(0.002, 0.002, 0.002);
    enemy.position.set(-2, 0, 0);
    enemy.rotation.y = 1/2 * Math.PI;
    scene.add(enemy);

    const glow = new THREE.PointLight(0xff4444, 0.8, 3, 2);
    glow.castShadow = false;
    enemy.add(glow);
    glow.position.set(0, 40, 0)

    mixer = new THREE.AnimationMixer(enemy);
    const action = mixer.clipAction(removeRootMotion(model.animations[0]));
    action.play();
  });

  running = true;
  animate();
}

function animate() {
  if (!running) return;

  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  if (enemy) {
    enemy.position.x += direction * delta * 0.5;

    if (enemy.position.x > 2) {
      direction = -1;
      enemy.rotation.y = 3/2 * Math.PI;
    } else if (enemy.position.x < -2) {
      direction = 1;
      enemy.rotation.y = 1/2 * Math.PI;
    }
  }

  renderer.render(scene, camera);
}

export function disposeStartScene() {
  running = false;
  renderer.dispose();
  document.body.removeChild(renderer.domElement);
}
