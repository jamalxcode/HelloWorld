const columnRatios = [0.22, 0.5, 0.78];
const bucketOffsets = [-0.28, 0, 0.28];
const sideOffsets = [-0.32, 0.32];

const DROP_SPEED = 160; // px per second baseline
const DROP_ACCELERATION = 8; // increases slightly with score
const MAX_LIVES = 3;
const SCORE_PER_DELIVERY = 10;

const state = {
  running: false,
  drops: [],
  lastSpawn: 0,
  spawnDelay: 1200,
  bucketIndex: 1,
  bucketFill: 0,
  lives: MAX_LIVES,
  score: 0,
  policemanIndex: 0,
  policemanTimer: 0,
  policemanDelay: 2600,
  friendlyIndex: 0,
  friendlyTimer: 0,
  friendlyDelay: 4200,
  lastFrameTime: 0,
};

const ui = {};

function queryUI() {
  ui.topScreen = document.querySelector('.top-screen');
  ui.bottomScreen = document.querySelector('.bottom-screen');
  ui.dropLayer = document.getElementById('drops');
  ui.bucket = document.getElementById('bucket');
  ui.bucketCells = ui.bucket.querySelectorAll('.cell');
  ui.bucketSlots = document.querySelectorAll('.slot');
  ui.score = document.getElementById('score');
  ui.misses = document.getElementById('misses');
  ui.overlay = document.getElementById('overlay');
  ui.overlayTitle = ui.overlay.querySelector('h2');
  ui.overlayText = ui.overlay.querySelector('p');
  ui.policeman = document.getElementById('policeman');
  ui.friendlyWrapper = document.querySelector('.friendly-wrapper');
}

const metrics = {
  columnXs: [0, 0, 0],
  bucketOffsetsPx: [0, 0, 0],
  catchLine: 0,
  sidePositions: [0, 0],
};

function recalcMetrics() {
  const width = ui.topScreen.clientWidth;
  const height = ui.topScreen.clientHeight;
  metrics.columnXs = columnRatios.map((ratio) => ratio * width);
  metrics.bucketOffsetsPx = bucketOffsets.map((ratio) => ratio * width);
  metrics.catchLine = height - 140;

  const bottomWidth = ui.bottomScreen.clientWidth;
  metrics.sidePositions = sideOffsets.map((ratio) => ratio * bottomWidth);
  applyBucketTransform();
  updatePolicemanPosition();
  updateFriendlyPosition();
  ui.dropLayer.querySelectorAll('.drop').forEach((node) => {
    const idx = Number(node.dataset.column);
    if (Number.isFinite(idx)) {
      node.style.left = `${metrics.columnXs[idx]}px`;
    }
  });
}

function applyBucketTransform() {
  ui.bucket.style.setProperty(
    '--bucket-offset',
    `${metrics.bucketOffsetsPx[state.bucketIndex] || 0}px`
  );
}

function updateBucketCells() {
  ui.bucketCells.forEach((cell, index) => {
    cell.classList.toggle('fill', index < state.bucketFill);
  });
  ui.bucketSlots.forEach((slot, index) => {
    slot.classList.toggle('fill', index < state.bucketFill);
  });
}

function updateScoreboard() {
  ui.score.textContent = state.score.toString().padStart(4, '0');
  ui.misses.textContent = (MAX_LIVES - state.lives).toString();
}

function clearDrops() {
  state.drops.forEach((drop) => drop.node.remove());
  state.drops = [];
  ui.dropLayer.innerHTML = '';
}

function resetState() {
  state.running = true;
  state.drops = [];
  state.lastSpawn = 0;
  state.spawnDelay = 1200;
  state.bucketIndex = 1;
  state.bucketFill = 0;
  state.lives = MAX_LIVES;
  state.score = 0;
  state.policemanIndex = 0;
  state.policemanTimer = 0;
  state.policemanDelay = 2600;
  state.friendlyIndex = 0;
  state.friendlyTimer = 0;
  state.friendlyDelay = 4200;
  state.lastFrameTime = performance.now();
  clearDrops();
  applyBucketTransform();
  updateBucketCells();
  updateScoreboard();
  updatePolicemanPosition();
  updateFriendlyPosition();
}

function spawnDrop(timestamp) {
  const column = Math.floor(Math.random() * columnRatios.length);
  const node = document.createElement('div');
  node.className = 'drop';
  node.dataset.column = column;
  node.style.left = `${metrics.columnXs[column]}px`;
  node.style.top = '90px';
  ui.dropLayer.appendChild(node);
  state.drops.push({
    column,
    y: 90,
    speed: DROP_SPEED + DROP_ACCELERATION * (state.score / 10),
    node,
  });
  state.lastSpawn = timestamp;
  const speedFactor = Math.min(state.score / 200, 0.45);
  state.spawnDelay = 1200 - 600 * speedFactor;
}

function removeDrop(index) {
  const drop = state.drops[index];
  if (!drop) return;
  drop.node.remove();
  state.drops.splice(index, 1);
}

function registerMiss() {
  if (state.lives <= 0) return;
  state.lives -= 1;
  updateScoreboard();
  sounds.spill();
  if (state.lives <= 0) {
    endGame();
  }
}

function deliverOil(side) {
  if (state.bucketFill === 0) return;
  const policemanSide = state.policemanIndex;
  const friendlySide = state.friendlyIndex;
  if (policemanSide === side) {
    registerMiss();
  } else if (friendlySide === side) {
    state.score += SCORE_PER_DELIVERY * state.bucketFill;
    state.bucketFill = 0;
    updateScoreboard();
    sounds.deliver();
    shuffleFriendly();
  } else {
    registerMiss();
  }
  state.bucketFill = 0;
  updateBucketCells();
}

function shuffleFriendly() {
  const next = Math.random() > 0.5 ? 1 : 0;
  state.friendlyIndex = next;
  updateFriendlyPosition();
}

function updatePolicemanPosition() {
  const offset = metrics.sidePositions[state.policemanIndex] || 0;
  ui.policeman.style.transform = `translateX(${offset}px)`;
}

function updateFriendlyPosition() {
  const offset = metrics.sidePositions[state.friendlyIndex] || 0;
  ui.friendlyWrapper.style.transform = `translateX(${offset}px)`;
}

function handleKeyDown(event) {
  if (event.repeat) return;
  if (event.code === 'Enter') {
    if (!state.running) {
      ui.overlay.classList.add('hidden');
      resetState();
      requestAnimationFrame(loop);
    }
    sounds.unlock();
    return;
  }
  if (!state.running) return;
  if (event.code === 'ArrowLeft') {
    moveBucket(-1);
  } else if (event.code === 'ArrowRight') {
    moveBucket(1);
  } else if (event.code === 'Space') {
    emptyBucket();
  }
  sounds.unlock();
}

function moveBucket(direction) {
  const next = state.bucketIndex + direction;
  if (next < 0 || next >= bucketOffsets.length) return;
  state.bucketIndex = next;
  applyBucketTransform();
  sounds.move();
}

function emptyBucket() {
  if (state.bucketIndex === 1) {
    sounds.denied();
    return;
  }
  const side = state.bucketIndex === 0 ? 0 : 1;
  deliverOil(side);
}

function endGame() {
  state.running = false;
  ui.overlay.classList.remove('hidden');
  ui.overlayTitle.textContent = 'Game Over';
  ui.overlayText.textContent = `Final score ${state.score.toString().padStart(4, '0')}. Press Enter to play again.`;
  sounds.gameOver();
}

function updateDrops(delta, timestamp) {
  for (let i = state.drops.length - 1; i >= 0; i -= 1) {
    const drop = state.drops[i];
    drop.y += drop.speed * delta;
    drop.node.style.top = `${drop.y}px`;

    const bucketCenter = ui.topScreen.clientWidth / 2 + metrics.bucketOffsetsPx[state.bucketIndex];
    const dropX = metrics.columnXs[drop.column];
    const distance = Math.abs(dropX - bucketCenter);

    if (drop.y >= metrics.catchLine) {
      if (distance < 60 && state.bucketFill < 3) {
        state.bucketFill += 1;
        updateBucketCells();
        removeDrop(i);
        sounds.catch();
        continue;
      }
    }

    if (drop.y > ui.topScreen.clientHeight - 40) {
      removeDrop(i);
      registerMiss();
    }
  }

  if (timestamp - state.lastSpawn > state.spawnDelay) {
    spawnDrop(timestamp);
  }
}

function updateCharacters(delta) {
  state.policemanTimer += delta * 1000;
  if (state.policemanTimer >= state.policemanDelay) {
    state.policemanIndex = state.policemanIndex === 0 ? 1 : 0;
    state.policemanTimer = 0;
    state.policemanDelay = 2200 + Math.random() * 1200;
    updatePolicemanPosition();
  }

  state.friendlyTimer += delta * 1000;
  if (state.friendlyTimer >= state.friendlyDelay) {
    state.friendlyTimer = 0;
    state.friendlyDelay = 3000 + Math.random() * 2200;
    shuffleFriendly();
  }
}

function loop(timestamp) {
  if (!state.running) return;
  const delta = (timestamp - state.lastFrameTime) / 1000;
  state.lastFrameTime = timestamp;
  updateDrops(delta, timestamp);
  updateCharacters(delta);
  requestAnimationFrame(loop);
}

const sounds = (() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  function ensureContext() {
    if (!AudioContextClass) return null;
    if (!ctx) {
      ctx = new AudioContextClass();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function playTone(freq, duration, type = 'square', gainValue = 0.15) {
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  return {
    unlock() {
      ensureContext();
    },
    catch() {
      playTone(980, 0.08, 'triangle', 0.18);
    },
    spill() {
      playTone(220, 0.3, 'sawtooth', 0.2);
    },
    deliver() {
      playTone(640, 0.2, 'square', 0.18);
      setTimeout(() => playTone(860, 0.2, 'square', 0.16), 80);
    },
    move() {
      playTone(420, 0.06, 'square', 0.1);
    },
    denied() {
      playTone(120, 0.12, 'triangle', 0.12);
    },
    gameOver() {
      playTone(180, 0.4, 'sawtooth', 0.18);
      setTimeout(() => playTone(120, 0.4, 'sawtooth', 0.18), 200);
    },
  };
})();

function init() {
  queryUI();
  recalcMetrics();
  updateBucketCells();
  updateScoreboard();
  window.addEventListener('resize', recalcMetrics);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('pointerdown', sounds.unlock, { once: true });
  document.addEventListener('touchstart', sounds.unlock, { once: true });
  ui.overlay.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
