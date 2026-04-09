/* ===== game.js – SPLAT! Flappy Bird ===== */
'use strict';

// ─── Constants ──────────────────────────────────────────────────────────────
const W = 480, H = 720;
const GRAVITY      = 0.45;
const FLAP_FORCE   = -9.5;
const PIPE_SPEED   = 3.2;
const PIPE_GAP     = 178;
const PIPE_MIN_H   = 80;
const PIPE_SPAWN_X = 550;
const PIPE_INTERVAL_MS = 1700;
const GROUND_H     = 80;
const BIRD_W       = 48, BIRD_H = 38;
const BIRD_X       = 100;

// Colour palette
const C = {
  sky1:        '#0d0620', sky2:        '#1a0a38',
  ground1:     '#1b0e36', ground2:     '#0d0620',
  grassTop:    '#39ff14',
  pipeBody1:   '#00c3ff', pipeBody2:   '#0070c0',
  pipeCap1:    '#00f5ff', pipeCap2:    '#0090e0',
  pipeGlow:    'rgba(0,245,255,0.35)',
  starColor:   'rgba(200,180,255,',
  neonCyan:    '#00f5ff',
  neonPurple:  '#b44fff',
  neonPink:    '#ff4fa3',
  neonYellow:  '#ffe033',
  neonGreen:   '#39ff14',
};

// ─── State ───────────────────────────────────────────────────────────────────
let state = 'start'; // start | countdown | playing | paused | gameover
let score = 0;
let hiScore = +localStorage.getItem('splat_hi') || 0;
let animId = null;
let lastPipeTime = 0;
let countdownVal = 3;
let countdownTimer = null;
let frameCount = 0;

// Physics
let bird = {};
let pipes = [];
let particles = [];
let stars = [];
let groundOffset = 0;
let bgOffset = 0;
let bgClouds = [];

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const bgCanvas    = document.getElementById('bg-canvas');
const gameCanvas  = document.getElementById('game-canvas');
const bgCtx       = bgCanvas.getContext('2d');
const ctx         = gameCanvas.getContext('2d');

const screens = {
  start:    document.getElementById('start-screen'),
  pause:    document.getElementById('pause-screen'),
  gameover: document.getElementById('game-over-screen'),
};
const hud          = document.getElementById('hud');
const hudScore     = document.getElementById('hud-score');
const countdownEl  = document.getElementById('countdown');

const startBtn   = document.getElementById('start-btn');
const resumeBtn  = document.getElementById('resume-btn');
const quitBtn    = document.getElementById('quit-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn    = document.getElementById('menu-btn');
const pauseBtn   = document.getElementById('pause-btn');

const birdPreview   = document.getElementById('bird-preview');
const finalScore    = document.getElementById('final-score');
const finalBest     = document.getElementById('final-best');
const medalDisplay  = document.getElementById('medal-display');
const hsDisplay     = document.getElementById('hs-display');
const hsValue       = document.getElementById('hs-value');
const pauseScoreVal = document.getElementById('pause-score-val');

// ─── Canvas Size ─────────────────────────────────────────────────────────────
function resizeCanvases() {
  const app = document.getElementById('app');
  const rect = app.getBoundingClientRect();
  bgCanvas.width = gameCanvas.width = rect.width;
  bgCanvas.height = gameCanvas.height = rect.height;
}

// ─── Stars ───────────────────────────────────────────────────────────────────
function initStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * (H - GROUND_H),
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.4 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
}

// ─── Clouds ──────────────────────────────────────────────────────────────────
function initClouds() {
  bgClouds = [];
  for (let i = 0; i < 5; i++) {
    bgClouds.push({
      x: Math.random() * W,
      y: 60 + Math.random() * 200,
      w: 80 + Math.random() * 100,
      h: 30 + Math.random() * 30,
      alpha: 0.03 + Math.random() * 0.07,
      speed: 0.2 + Math.random() * 0.3,
    });
  }
}

// ─── Bird ────────────────────────────────────────────────────────────────────
function resetBird() {
  bird = {
    x: BIRD_X, y: H / 2 - 60,
    vy: 0, vx: 0,
    angle: 0,
    alive: true,
    wingPhase: 0,
    trailPoints: [],
    hitFlash: 0,
  };
}

// ─── Pipes ───────────────────────────────────────────────────────────────────
function spawnPipe() {
  const topH = PIPE_MIN_H + Math.random() * (H - GROUND_H - PIPE_GAP - PIPE_MIN_H * 2);
  pipes.push({
    x: W + 50,
    topH,
    botY: topH + PIPE_GAP,
    botH: H - GROUND_H - topH - PIPE_GAP,
    scored: false,
    glow: 0,
  });
}

// ─── Particles ───────────────────────────────────────────────────────────────
function spawnParticles(x, y, count, color, speed = 5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random());
    particles.push({
      x, y,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s - 2,
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      r: 3 + Math.random() * 5,
      color,
    });
  }
}

function spawnScoreParticles(px, py) {
  const cols = [C.neonCyan, C.neonPurple, C.neonPink, C.neonYellow, C.neonGreen];
  spawnParticles(px, py, 20, cols[Math.floor(Math.random() * cols.length)], 6);
}

// ─── Draw Background ─────────────────────────────────────────────────────────
function drawBackground() {
  const bw = bgCanvas.width, bh = bgCanvas.height;
  // Sky gradient
  const skyGrad = bgCtx.createLinearGradient(0, 0, 0, bh - GROUND_H);
  skyGrad.addColorStop(0,   C.sky1);
  skyGrad.addColorStop(0.5, C.sky2);
  skyGrad.addColorStop(1,   '#2b0a5f');
  bgCtx.fillStyle = skyGrad;
  bgCtx.fillRect(0, 0, bw, bh - GROUND_H);

  // Stars
  const t = Date.now() * 0.001;
  stars.forEach(s => {
    s.twinkle += 0.02;
    const a = s.alpha * (0.5 + 0.5 * Math.sin(s.twinkle));
    bgCtx.beginPath();
    bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `${C.starColor}${a})`;
    bgCtx.fill();
  });

  // Clouds
  bgClouds.forEach(c => {
    bgCtx.save();
    bgCtx.globalAlpha = c.alpha;
    bgCtx.fillStyle = 'white';
    bgCtx.beginPath();
    bgCtx.ellipse(c.x, c.y, c.w, c.h, 0, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.restore();
  });

  // Ambient nebula glow
  const neb = bgCtx.createRadialGradient(bw * 0.7, bh * 0.3, 0, bw * 0.7, bh * 0.3, 220);
  neb.addColorStop(0, 'rgba(120,50,255,0.08)');
  neb.addColorStop(1, 'transparent');
  bgCtx.fillStyle = neb;
  bgCtx.fillRect(0, 0, bw, bh);

  const neb2 = bgCtx.createRadialGradient(bw * 0.2, bh * 0.6, 0, bw * 0.2, bh * 0.6, 180);
  neb2.addColorStop(0, 'rgba(0,180,255,0.06)');
  neb2.addColorStop(1, 'transparent');
  bgCtx.fillStyle = neb2;
  bgCtx.fillRect(0, 0, bw, bh);
}

// ─── Draw Ground ─────────────────────────────────────────────────────────────
function drawGround() {
  const bw = bgCanvas.width, bh = bgCanvas.height;
  const gy = bh - GROUND_H;

  // Ground body
  const gGrad = bgCtx.createLinearGradient(0, gy, 0, bh);
  gGrad.addColorStop(0, '#1b0e36');
  gGrad.addColorStop(1, '#0d0620');
  bgCtx.fillStyle = gGrad;
  bgCtx.fillRect(0, gy, bw, GROUND_H);

  // Glowing grass line
  bgCtx.save();
  bgCtx.shadowColor = C.grassTop;
  bgCtx.shadowBlur  = 12;
  bgCtx.strokeStyle = C.grassTop;
  bgCtx.lineWidth   = 3;
  bgCtx.beginPath();
  bgCtx.moveTo(0, gy);
  bgCtx.lineTo(bw, gy);
  bgCtx.stroke();
  bgCtx.restore();

  // Scrolling ground tile pattern
  bgCtx.save();
  bgCtx.globalAlpha = 0.15;
  bgCtx.strokeStyle = C.neonGreen;
  bgCtx.lineWidth = 1;
  const tileW = 40;
  const off = groundOffset % tileW;
  for (let x = -off; x < bw + tileW; x += tileW) {
    bgCtx.beginPath();
    bgCtx.moveTo(x, gy + 2);
    bgCtx.lineTo(x, bh);
    bgCtx.stroke();
  }
  bgCtx.restore();
}

// ─── Draw Pipe ───────────────────────────────────────────────────────────────
const PIPE_W = 68;
const CAP_H  = 24;
const CAP_EXTRA = 8; // extra width on each side

function drawPipe(pipe) {
  const gw = gameCanvas.width;
  const px = pipe.x;

  // Glow pass
  ctx.save();
  ctx.shadowColor = C.pipeGlow;
  ctx.shadowBlur  = 20 + pipe.glow * 10;
  ctx.globalAlpha = 0.5;

  // Top pipe body
  const topGrad = ctx.createLinearGradient(px, 0, px + PIPE_W, 0);
  topGrad.addColorStop(0, C.pipeBody2);
  topGrad.addColorStop(0.35, C.pipeBody1);
  topGrad.addColorStop(1, C.pipeBody2);
  ctx.fillStyle = topGrad;
  ctx.fillRect(px, 0, PIPE_W, pipe.topH - CAP_H);

  // Top pipe cap
  const capGrad = ctx.createLinearGradient(px - CAP_EXTRA, 0, px + PIPE_W + CAP_EXTRA, 0);
  capGrad.addColorStop(0, C.pipeCap2);
  capGrad.addColorStop(0.4, C.pipeCap1);
  capGrad.addColorStop(1, C.pipeCap2);
  ctx.fillStyle = capGrad;
  roundRect(ctx, px - CAP_EXTRA, pipe.topH - CAP_H, PIPE_W + CAP_EXTRA * 2, CAP_H, [0, 0, 8, 8]);
  ctx.fill();

  // Bottom pipe body
  ctx.fillStyle = topGrad;
  ctx.fillRect(px, pipe.botY + CAP_H, PIPE_W, pipe.botH - CAP_H);

  // Bottom pipe cap
  ctx.fillStyle = capGrad;
  roundRect(ctx, px - CAP_EXTRA, pipe.botY, PIPE_W + CAP_EXTRA * 2, CAP_H, [8, 8, 0, 0]);
  ctx.fill();

  ctx.restore();

  // Specular highlight on pipes
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = 'white';
  ctx.fillRect(px + 8, 0, 6, pipe.topH - CAP_H);
  ctx.fillRect(px + 8, pipe.botY + CAP_H, 6, pipe.botH - CAP_H);
  ctx.restore();

  // Neon edge glow
  ctx.save();
  ctx.strokeStyle = C.neonCyan;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4 + pipe.glow * 0.4;
  ctx.shadowColor = C.neonCyan;
  ctx.shadowBlur  = 8;
  ctx.strokeRect(px, 0, PIPE_W, pipe.topH - CAP_H);
  ctx.strokeRect(px, pipe.botY + CAP_H, PIPE_W, pipe.botH - CAP_H);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + r[0], y);
  ctx.lineTo(x + w - r[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
  ctx.lineTo(x + w, y + h - r[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
  ctx.lineTo(x + r[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
  ctx.lineTo(x, y + r[0]);
  ctx.quadraticCurveTo(x, y, x + r[0], y);
  ctx.closePath();
}

// ─── Draw Bird ───────────────────────────────────────────────────────────────
function drawBird(bx, by, angle, wingPhase, hitFlash) {
  ctx.save();
  ctx.translate(bx + BIRD_W / 2, by + BIRD_H / 2);
  ctx.rotate(angle);

  const wingAmp = Math.sin(wingPhase) * 0.4;

  // Trail
  if (state === 'playing') {
    bird.trailPoints.unshift({ x: 0, y: 0, t: 1 });
    if (bird.trailPoints.length > 12) bird.trailPoints.pop();
  }
  bird.trailPoints.forEach((pt, i) => {
    pt.t -= 0.08;
    if (pt.t < 0) pt.t = 0;
    const sz = (BIRD_W / 2) * pt.t * 0.6;
    ctx.save();
    ctx.translate(-i * 4, 0);
    ctx.globalAlpha = pt.t * 0.25;
    ctx.fillStyle = C.neonCyan;
    ctx.beginPath();
    ctx.ellipse(0, 0, sz, sz * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Body glow
  ctx.save();
  ctx.shadowColor = hitFlash > 0 ? C.neonPink : C.neonYellow;
  ctx.shadowBlur  = hitFlash > 0 ? 30 : 18;
  ctx.restore();

  // Wing shadow
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ff6a00';
  ctx.beginPath();
  ctx.ellipse(-2, 4 + wingAmp * 8, 14, 8, wingAmp * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 20);
  bodyGrad.addColorStop(0, hitFlash > 0 ? '#ffffff' : '#ffe033');
  bodyGrad.addColorStop(0.5, hitFlash > 0 ? '#ff4fa3' : '#ff9f00');
  bodyGrad.addColorStop(1, hitFlash > 0 ? '#b44fff' : '#e05000');
  ctx.fillStyle = bodyGrad;
  ctx.shadowColor = hitFlash > 0 ? C.neonPink : C.neonYellow;
  ctx.shadowBlur  = 20;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_W / 2, BIRD_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = 'rgba(255,200,0,0.5)';
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.ellipse(-4, wingAmp * 10, 12, 7, -0.3 + wingAmp, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eye
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(8, -6, 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0a38';
  ctx.beginPath();
  ctx.ellipse(10, -5, 3.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(11, -7, 1.5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ff8c00';
  ctx.beginPath();
  ctx.moveTo(18, -2);
  ctx.lineTo(26, 1);
  ctx.lineTo(18, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e05000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, 1.5);
  ctx.lineTo(24, 1.5);
  ctx.stroke();

  ctx.restore();
}

// Draw bird for the preview (start screen)
function drawPreviewBird() {
  const cvs = document.createElement('canvas');
  cvs.width = 64; cvs.height = 64;
  const c2 = cvs.getContext('2d');
  c2.save();
  c2.translate(32, 32);

  // Body
  const bg = c2.createRadialGradient(-4, -4, 2, 0, 0, 20);
  bg.addColorStop(0, '#ffe033');
  bg.addColorStop(0.5, '#ff9f00');
  bg.addColorStop(1, '#e05000');
  c2.fillStyle = bg;
  c2.shadowColor = C.neonYellow;
  c2.shadowBlur  = 16;
  c2.beginPath();
  c2.ellipse(0, 0, 20, 16, 0, 0, Math.PI * 2);
  c2.fill();

  // Wing
  c2.fillStyle = '#ffd700';
  c2.beginPath();
  c2.ellipse(-4, 6, 12, 7, -0.3, 0, Math.PI * 2);
  c2.fill();

  // Eye
  c2.fillStyle = 'white'; c2.beginPath(); c2.ellipse(10, -5, 5, 5, 0, 0, Math.PI * 2); c2.fill();
  c2.fillStyle = '#1a0a38'; c2.beginPath(); c2.ellipse(11, -4, 3, 3, 0, 0, Math.PI * 2); c2.fill();
  c2.fillStyle = 'white'; c2.beginPath(); c2.ellipse(12, -5.5, 1.2, 1.2, 0, 0, Math.PI * 2); c2.fill();

  // Beak
  c2.fillStyle = '#ff8c00';
  c2.beginPath(); c2.moveTo(18, -2); c2.lineTo(24, 1); c2.lineTo(18, 4); c2.closePath(); c2.fill();

  c2.restore();
  birdPreview.replaceChildren(cvs);
}

// ─── Draw Particles ──────────────────────────────────────────────────────────
function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ─── Collision ───────────────────────────────────────────────────────────────
function checkCollision() {
  const bx1 = bird.x + 6,  by1 = bird.y + 4;
  const bx2 = bird.x + BIRD_W - 6, by2 = bird.y + BIRD_H - 4;

  // Ground
  if (by2 >= gameCanvas.height - GROUND_H) return true;
  // Ceiling
  if (by1 <= 0) return true;

  for (const p of pipes) {
    const px1 = p.x - CAP_EXTRA, px2 = p.x + PIPE_W + CAP_EXTRA;
    if (bx2 > px1 && bx1 < px2) {
      if (by1 < p.topH || by2 > p.botY) return true;
    }
  }
  return false;
}

// ─── Update ──────────────────────────────────────────────────────────────────
function update(ts) {
  if (state !== 'playing') return;
  frameCount++;

  // Bird physics
  bird.vy += GRAVITY;
  bird.y  += bird.vy;
  bird.wingPhase += 0.18;
  bird.angle = Math.min(Math.PI / 3, Math.max(-Math.PI / 4, bird.vy * 0.06));
  if (bird.hitFlash > 0) bird.hitFlash--;

  // Scroll ground + clouds
  groundOffset += PIPE_SPEED;
  bgOffset     += PIPE_SPEED * 0.4;
  bgClouds.forEach(c => {
    c.x -= c.speed;
    if (c.x + c.w < 0) c.x = W + c.w;
  });

  // Spawn pipes
  if (ts - lastPipeTime > PIPE_INTERVAL_MS) {
    spawnPipe();
    lastPipeTime = ts;
  }

  // Move pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= PIPE_SPEED;
    pipes[i].glow = Math.max(0, pipes[i].glow - 0.05);

    // Score
    if (!pipes[i].scored && pipes[i].x + PIPE_W < bird.x) {
      pipes[i].scored = true;
      score++;
      hudScore.textContent = score;
      hudScore.classList.remove('pop');
      void hudScore.offsetWidth;
      hudScore.classList.add('pop');
      spawnScoreParticles(bird.x + BIRD_W / 2, bird.y + BIRD_H / 2);
      pipes[i].glow = 1;
    }
    if (pipes[i].x + PIPE_W + CAP_EXTRA < 0) pipes.splice(i, 1);
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.15;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Collision
  if (checkCollision()) {
    bird.alive = false;
    bird.hitFlash = 20;
    spawnParticles(bird.x + BIRD_W / 2, bird.y + BIRD_H / 2, 40, C.neonPink, 8);
    spawnParticles(bird.x + BIRD_W / 2, bird.y + BIRD_H / 2, 20, C.neonYellow, 5);
    setTimeout(showGameOver, 600);
    state = 'dead';
  }
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render() {
  const cw = gameCanvas.width, ch = gameCanvas.height;
  ctx.clearRect(0, 0, cw, ch);

  // Pipes
  pipes.forEach(p => drawPipe(p));

  // Ground over game canvas (edge line only)
  ctx.save();
  ctx.shadowColor = C.grassTop;
  ctx.shadowBlur  = 14;
  ctx.strokeStyle = C.grassTop;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0, ch - GROUND_H);
  ctx.lineTo(cw, ch - GROUND_H);
  ctx.stroke();
  ctx.restore();

  // Bird
  drawBird(bird.x, bird.y, bird.angle, bird.wingPhase, bird.hitFlash);

  // Particles
  drawParticles();
}

// ─── Background loop (separate) ───────────────────────────────────────────────
function renderBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  drawBackground();
  drawGround();
}

// ─── Main Loop ───────────────────────────────────────────────────────────────
let lastTs = 0;
function loop(ts) {
  if (ts - lastTs > 100) lastTs = ts - 16;
  update(ts);
  renderBg();
  render();
  lastTs = ts;
  animId = requestAnimationFrame(loop);
}

// ─── Screen Management ───────────────────────────────────────────────────────
function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle('active', k === name);
    if (k === name) el.classList.add('has-blur');
    else el.classList.remove('has-blur');
  });
}

function hideAllScreens() {
  Object.values(screens).forEach(el => {
    el.classList.remove('active', 'has-blur');
  });
}

// ─── Flap ────────────────────────────────────────────────────────────────────
function flap() {
  if (state !== 'playing' || !bird.alive) return;
  bird.vy = FLAP_FORCE;
  spawnParticles(bird.x, bird.y + BIRD_H / 2, 5, C.neonCyan, 3);
}

// ─── Countdown ───────────────────────────────────────────────────────────────
function startCountdown(onDone) {
  countdownVal = 3;
  state = 'countdown';
  countdownEl.classList.remove('hidden');
  countdownEl.textContent = countdownVal;

  const tick = () => {
    countdownVal--;
    if (countdownVal <= 0) {
      countdownEl.classList.add('hidden');
      onDone();
    } else {
      countdownEl.textContent = countdownVal;
      // Retrigger animation
      countdownEl.style.animation = 'none';
      void countdownEl.offsetWidth;
      countdownEl.style.animation = '';
      countdownTimer = setTimeout(tick, 700);
    }
  };
  countdownEl.style.animation = 'none';
  void countdownEl.offsetWidth;
  countdownEl.style.animation = '';
  countdownTimer = setTimeout(tick, 700);
}

// ─── Game Start ──────────────────────────────────────────────────────────────
function startGame() {
  score = 0;
  pipes = [];
  particles = [];
  frameCount = 0;
  lastPipeTime = -9999;
  resetBird();
  hideAllScreens();
  hud.classList.remove('hidden');
  hudScore.textContent = '0';

  startCountdown(() => {
    state = 'playing';
    lastPipeTime = performance.now();
    pauseBtn.style.display = '';
  });
}

// ─── Pause / Resume ──────────────────────────────────────────────────────────
function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused';
  pauseScoreVal.textContent = score;
  showScreen('pause');
}

function resumeGame() {
  showScreen(null);
  hideAllScreens();
  startCountdown(() => { state = 'playing'; });
}

// ─── Game Over ───────────────────────────────────────────────────────────────
function showGameOver() {
  state = 'gameover';
  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('splat_hi', hiScore);
  }
  hud.classList.add('hidden');
  // Report score to GameHub parent (×100 so 10 pipes = 1000 pts)
  window.parent.postMessage({ type: 'flappy-gameover', score: score * 100 }, '*');
}

function goToMenu() {
  state = 'start';
  pipes = [];
  particles = [];
  resetBird();
  hideAllScreens();
  hud.classList.add('hidden');
  updateStartScreen();
  showScreen('start');
}

function updateStartScreen() {
  if (hiScore > 0) {
    hsDisplay.style.display = 'flex';
    hsValue.textContent = hiScore;
  } else {
    hsDisplay.style.display = 'none';
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
startBtn.addEventListener('click',   startGame);
restartBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click',  resumeGame);
quitBtn.addEventListener('click',    goToMenu);
menuBtn.addEventListener('click',    goToMenu);
pauseBtn.addEventListener('click',   pauseGame);

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (state === 'playing') flap();
    else if (state === 'start') startGame();
    else if (state === 'gameover') startGame();
    else if (state === 'paused') resumeGame();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (state === 'playing') pauseGame();
    else if (state === 'paused') resumeGame();
  }
});

// Touch / click on app container (gameCanvas has pointer-events:none in CSS)
document.getElementById('app').addEventListener('pointerdown', e => {
  e.preventDefault();
  if (state === 'playing') flap();
  else if (state === 'start') startGame();
  else if (state === 'gameover') startGame();
  else if (state === 'paused') resumeGame();
});

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  resizeCanvases();
  initStars();
  initClouds();
  resetBird();
  drawPreviewBird();
  updateStartScreen();
  showScreen('start');
  animId = requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  resizeCanvases();
});

init();
