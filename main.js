import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TextureLoader } from 'three';

let scene, camera, renderer, controls;
let player, moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const speed = 0.1;
let wallBoxes = [];
let minimapCamera;


function generateMaze(size) {
    const maze = Array.from({ length: size }, () => Array(size).fill(1));

    function carve(x, y) {
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ].sort(() => Math.random() - 0.5); // Shuffle

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < size && ny >= 0 && ny < size && maze[ny][nx] === 1) {
                maze[ny][nx] = 0;
                maze[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }

    maze[1][1] = 0; // Start point
    carve(1, 1);
    return maze;
}


function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, document.body);
    document.body.addEventListener('click', () => controls.lock());

    // 🌅 Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // ☀️ Directional Light (optional)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // 🧱 Maze layout (1 = wall, 0 = path)
    const mazeSize = 29; // Must be odd for proper walls
    const mazeLayout = generateMaze(mazeSize);

    // Get center point and ensure it's open
    const centerX = Math.floor(mazeSize / 2);
    const centerY = Math.floor(mazeSize / 2);
    mazeLayout[centerY][centerX] = 0;

    const wallSize = 2;
    const wallGeometry = new THREE.BoxGeometry(wallSize, 2, wallSize);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    const mazeWidth = mazeLayout[0].length * wallSize;
    const mazeHeight = mazeLayout.length * wallSize;
    const offsetX = -mazeWidth / 2 + wallSize / 2;
    const offsetZ = -mazeHeight / 2 + wallSize / 2;

    mazeLayout.forEach((row, z) => {
        row.forEach((cell, x) => {
            if (cell === 1) {
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.position.set(x * wallSize + offsetX, 1, z * wallSize + offsetZ);
                wall.castShadow = true;
                scene.add(wall);

                wall.updateMatrixWorld(); // Ensure bounding box is accurate
                const wallBox = new THREE.Box3().setFromObject(wall);
                wallBoxes.push(wallBox);
            }
        });
    });

    // 🟩 Ground with texture
    const textureLoader = new TextureLoader();
    const grassTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(25, 25);

    const groundMaterial = new THREE.MeshStandardMaterial({ map: grassTexture });
    const groundSize = Math.max(mazeLayout.length, mazeLayout[0].length) * wallSize;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const goalX = centerX * wallSize + offsetX;
    const goalZ = centerY * wallSize + offsetZ;

    const goalGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 32);
    const goalMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const goal = new THREE.Mesh(goalGeometry, goalMaterial);
    goal.position.set(goalX, 0.1, goalZ);
    scene.add(goal);

    const plateCandidates = [];
    for (let y = Math.floor(mazeSize / 2); y < mazeSize; y++) {
        for (let x = Math.floor(mazeSize / 2); x < mazeSize; x++) {
            if (mazeLayout[y][x] === 0) {
                plateCandidates.push([x, y]);
            }
        }
    }

    // 🎯 Randomly pick one of those
    const [plateX, plateY] = plateCandidates[Math.floor(Math.random() * plateCandidates.length)];
    const plateWorldX = plateX * wallSize + offsetX;
    const plateWorldZ = plateY * wallSize + offsetZ;

    // 🟪 Create and place the pressure plate
    const plateGeometry = new THREE.BoxGeometry(wallSize, 0.1, wallSize);
    const plateMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const pressurePlate = new THREE.Mesh(plateGeometry, plateMaterial);
    pressurePlate.position.set(plateWorldX, 0.05, plateWorldZ);
    scene.add(pressurePlate);

    // 🧍 Player
    const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    // Start at tile (1,1)
    const startX = 1 * wallSize + offsetX;
    const startZ = 1 * wallSize + offsetZ;
    player.position.set(startX, 1, startZ);
    scene.add(player);

    camera.position.set(startX, 1.6, startZ);

    // 📡 Minimap camera (orthographic, top-down)
    const aspect = window.innerWidth / window.innerHeight;
    const mapSize = mazeLayout.length * wallSize;
    minimapCamera = new THREE.OrthographicCamera(
        -mapSize / 2, mapSize / 2,
        mapSize / 2, -mapSize / 2,
        0.1, 100
    );
    minimapCamera.position.set(0, 50, 0); // High above
    minimapCamera.lookAt(0, 0, 0);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    animate();
}


function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
    }
}


function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}


function animate() {
    requestAnimationFrame(animate);

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const moveDelta = new THREE.Vector3();

    if (moveForward) moveDelta.addScaledVector(direction, speed);
    if (moveBackward) moveDelta.addScaledVector(direction, -speed);

    const sideways = new THREE.Vector3();
    sideways.crossVectors(camera.up, direction).normalize();

    if (moveLeft) moveDelta.addScaledVector(sideways, speed);
    if (moveRight) moveDelta.addScaledVector(sideways, -speed);

    let nextPosition = player.position.clone();
    let tempBox = new THREE.Box3();

    // Try X movement
    let tryX = player.position.clone();
    tryX.x += moveDelta.x;
    tempBox.setFromCenterAndSize(tryX, new THREE.Vector3(1, 2, 1));
    let xBlocked = wallBoxes.some(wallBox => tempBox.intersectsBox(wallBox));

    // Try Z movement
    let tryZ = player.position.clone();
    tryZ.z += moveDelta.z;
    tempBox.setFromCenterAndSize(tryZ, new THREE.Vector3(1, 2, 1));
    let zBlocked = wallBoxes.some(wallBox => tempBox.intersectsBox(wallBox));

    if (!xBlocked) nextPosition.x += moveDelta.x;
    if (!zBlocked) nextPosition.z += moveDelta.z;

    // Apply movement
    player.position.copy(nextPosition);
    camera.position.copy(player.position).y += 0.6;

    // 🎮 Main view
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(false);
    renderer.render(scene, camera);

    // 🗺️ Minimap view (top-right corner)
    const mapWidth = 200, mapHeight = 200;
    renderer.setViewport(window.innerWidth - mapWidth - 10, window.innerHeight - mapHeight - 10, mapWidth, mapHeight);
    renderer.setScissor(window.innerWidth - mapWidth - 10, window.innerHeight - mapHeight - 10, mapWidth, mapHeight);
    renderer.setScissorTest(true);
    renderer.setClearColor(0x000000, 1); // Minimap background
    renderer.clear();
    renderer.render(scene, minimapCamera);
}


init();
