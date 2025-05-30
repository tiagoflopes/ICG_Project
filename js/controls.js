export function setupControls(moveState, keyDownFn, keyUpFn) {
  document.addEventListener('keydown', (e) => keyDownFn(e, moveState));
  document.addEventListener('keyup', (e) => keyUpFn(e, moveState));
}

export function handleKeyDown(event, moveState) {
  switch (event.code) {
    case 'KeyW': moveState.forward = true; break;
    case 'KeyS': moveState.backward = true; break;
    case 'KeyA': moveState.left = true; break;
    case 'KeyD': moveState.right = true; break;
    case 'ShiftLeft': moveState.run = true; break;
  }
}

export function handleKeyUp(event, moveState) {
  switch (event.code) {
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
    case 'ShiftLeft': moveState.run = false; break;
  }
}
