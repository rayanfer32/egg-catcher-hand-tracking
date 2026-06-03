const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W = canvas.width, H = canvas.height;

// ─── Game State ───────────────────────────────────────────────────────────────
let state = 'menu'; // menu | playing | gameover
let score = 0, bestScore = parseInt(localStorage.getItem('eggBest')||'0');
let lives = 3, level = 1;
const MAX_LIVES = 3;
let combo = 0, comboTimer = 0;
let useHandTracking = false;
let handX = W / 2;
let mouseX = W / 2;
let frameCount = 0;
let particles = [];
let floatingTexts = [];
let eggBounce = [];
let shakeTimer = 0;

let totalEggsCaught = 0;
let eggsCaughtThisLevel = 0;
let money = 0;
let currentBasketValue = 0;
let stackedBaskets = [];
let basketCapacity = 30;
let basketLevel = 1;

const BASKET_UPGRADES = [
  { level: 1, capacity: 30, cost: 150, name: "Woven Basket", color: "#c47c3a", rimColor: "#a3611e" },
  { level: 2, capacity: 45, cost: 300, name: "Sturdy Wood Basket", color: "#a05a2c", rimColor: "#7b3d11" },
  { level: 3, capacity: 60, cost: 500, name: "Reinforced Iron Basket", color: "#718096", rimColor: "#4a5568" },
  { level: 4, capacity: 80, cost: 800, name: "Golden Royalty Basket", color: "#ecc94b", rimColor: "#b7791f" },
  { level: 5, capacity: 100, cost: null, name: "Infinite Deluxe Basket", color: "#ed64a6", rimColor: "#b83280" }
];

let butterflies = [];
let flowers = [];

// Chicken sequencer state
let currentChickenIdx = 0;
let eggsToLay = 0;
let layDelayTimer = 0;

// ─── Assets (drawn procedurally) ─────────────────────────────────────────────
// Sky gradient
const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
skyGrad.addColorStop(0, '#87CEEB');
skyGrad.addColorStop(0.6, '#B0E0FF');
skyGrad.addColorStop(1, '#7EC850');

// ─── Chickens ─────────────────────────────────────────────────────────────────
const NUM_CHICKENS = 5;
const CHICKEN_NAMES = ['Clucky', 'Eggbert', 'Yolko', 'Feather', 'Peep'];
const chickens = Array.from({length: NUM_CHICKENS}, (_, i) => ({
  x: 80 + i * 165,
  y: 130,
  bobOffset: Math.random() * Math.PI * 2,
  active: true,
  level: 1,
  name: CHICKEN_NAMES[i],
  feedCost: 10
}));

// ─── Eggs ─────────────────────────────────────────────────────────────────────
let eggs = [];
const EGG_TYPES = [
  { color: '#fffde7', stroke: '#e0c97a', points: 1, speed: 1, label: '' },
  { color: '#ffd700', stroke: '#b8860b', points: 3, speed: 1.2, label: '✨', golden: true },
  { color: '#ff6b9d', stroke: '#c0396b', points: 2, speed: 1.4, label: '💗', bonus: true },
];

// ─── Basket ───────────────────────────────────────────────────────────────────
const basket = {
  x: W / 2,
  y: H - 70,
  width: 90,
  height: 60,
  targetX: W / 2
};

// ─── Clouds ───────────────────────────────────────────────────────────────────
let clouds = Array.from({length: 6}, (_, i) => ({
  x: (i * 160 + 50) % W,
  y: 120 + Math.random() * 120,
  w: 80 + Math.random() * 60,
  speed: 0.2 + Math.random() * 0.3,
  opacity: 0.5 + Math.random() * 0.4
}));

// ─── Grass details ────────────────────────────────────────────────────────────
let grassBlades = Array.from({length: 60}, () => ({
  x: Math.random() * W,
  h: 8 + Math.random() * 14,
  lean: (Math.random() - 0.5) * 0.4
}));

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function drawBackground() {
  // Sky
  const currentSkyGrad = ctx.createLinearGradient(0, 0, 0, H);
  currentSkyGrad.addColorStop(0, '#87CEEB');
  currentSkyGrad.addColorStop(0.6, '#B0E0FF');
  currentSkyGrad.addColorStop(1, '#7EC850');
  
  ctx.fillStyle = currentSkyGrad;
  ctx.fillRect(0, 0, W, H);

  // Sun in the sky (pulsing)
  let sunPulse = Math.sin(frameCount * 0.02) * 3;
  ctx.save();
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = '#eab308';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(W - 100, 80, 40 + sunPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Mountains
  ctx.fillStyle = '#8facc8';
  ctx.beginPath();
  ctx.moveTo(0, H - 120);
  ctx.lineTo(W * 0.133, H - 280);
  ctx.lineTo(W * 0.267, H - 180);
  ctx.lineTo(W * 0.400, H - 320);
  ctx.lineTo(W * 0.533, H - 200);
  ctx.lineTo(W * 0.667, H - 350);
  ctx.lineTo(W * 0.800, H - 210);
  ctx.lineTo(W, H - 290);
  ctx.lineTo(W, H - 120);
  ctx.closePath();
  ctx.fill();

  // Mountains lighter
  ctx.fillStyle = '#a8c4d8';
  ctx.beginPath();
  ctx.moveTo(0, H - 110);
  ctx.lineTo(W * 0.089, H - 220);
  ctx.lineTo(W * 0.222, H - 140);
  ctx.lineTo(W * 0.367, H - 260);
  ctx.lineTo(W * 0.511, H - 160);
  ctx.lineTo(W * 0.622, H - 230);
  ctx.lineTo(W * 0.778, H - 160);
  ctx.lineTo(W, H - 200);
  ctx.lineTo(W, H - 110);
  ctx.closePath();
  ctx.fill();

  // Clouds
  clouds.forEach(c => {
    ctx.save();
    ctx.globalAlpha = c.opacity;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x - c.w * 0.3, c.y + 8, c.w * 0.5, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + c.w * 0.3, c.y + 5, c.w * 0.45, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Wooden fence
  ctx.fillStyle = '#b45309';
  const fenceY = H - 100;
  const postSpacing = 60;
  for (let x = 0; x < W; x += postSpacing) {
    // Vertical post
    ctx.fillRect(x + 10, fenceY - 25, 8, 25);
    // Pointy top
    ctx.beginPath();
    ctx.moveTo(x + 10, fenceY - 25);
    ctx.lineTo(x + 14, fenceY - 30);
    ctx.lineTo(x + 18, fenceY - 25);
    ctx.closePath();
    ctx.fill();
  }
  // Horizontal rails
  ctx.fillRect(0, fenceY - 20, W, 3);
  ctx.fillRect(0, fenceY - 10, W, 3);

  // Ground
  ctx.fillStyle = '#5aad3a';
  ctx.fillRect(0, H - 100, W, 100);

  // Ground highlight
  ctx.fillStyle = '#6dc44a';
  ctx.fillRect(0, H - 100, W, 18);

  // Grass blades
  ctx.strokeStyle = '#4e9c30';
  ctx.lineWidth = 1.5;
  grassBlades.forEach(g => {
    ctx.save();
    ctx.translate(g.x, H - 100);
    ctx.rotate(g.lean);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(g.lean * 10, -g.h * 0.5, 0, -g.h);
    ctx.stroke();
    ctx.restore();
  });

  // Flowers on the ground
  flowers.forEach(f => {
    ctx.save();
    ctx.translate(f.x, f.y);
    
    // Draw stem
    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 6);
    ctx.stroke();

    // Draw petals
    ctx.fillStyle = f.color;
    for (let i = 0; i < 5; i++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.arc(f.size, 0, f.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Center
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, f.size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Butterflies flying around
  butterflies.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.scale, b.scale);
    
    let flap = Math.sin(frameCount * 0.15 + b.angle) * 0.55 + 0.75;
    ctx.fillStyle = b.color;
    
    // Left wings
    ctx.beginPath();
    ctx.ellipse(-3 * flap, -4, 6 * flap, 8, 0.25, 0, Math.PI * 2);
    ctx.ellipse(-2.5 * flap, 3, 4 * flap, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Right wings
    ctx.beginPath();
    ctx.ellipse(3 * flap, -4, 6 * flap, 8, -0.25, 0, Math.PI * 2);
    ctx.ellipse(2.5 * flap, 3, 4 * flap, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });

  // Trees
  drawTree(W * 0.09, H - 100, 50);
  drawTree(W - 80, H - 100, 60);
  drawTree(W * 0.18, H - 100, 35);

  // Hen shelf
  ctx.fillStyle = '#6b3a1f';
  ctx.fillRect(0, 160, W, 28);
  ctx.fillStyle = '#7d4a2a';
  ctx.fillRect(0, 160, W, 8);

  // Nest straw for each chicken
  chickens.forEach(c => {
    ctx.fillStyle = '#c8a040';
    ctx.beginPath();
    ctx.ellipse(c.x, 168, 36, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Straw lines
    ctx.strokeStyle = '#a07828';
    ctx.lineWidth = 1;
    for(let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(c.x + i*5 - 15, 165);
      ctx.lineTo(c.x + i*5, 172);
      ctx.stroke();
    }
  });
}

function drawTree(x, groundY, size) {
  ctx.fillStyle = '#6b3a1f';
  ctx.fillRect(x - 6, groundY - size * 1.2, 12, size * 1.2);
  ctx.fillStyle = '#3a8c22';
  ctx.beginPath();
  ctx.arc(x, groundY - size * 1.3, size * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4da030';
  ctx.beginPath();
  ctx.arc(x - size*0.2, groundY - size * 1.5, size * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawChicken(c, t, isActive, eggsLeft) {
  let bob = Math.sin(t * 0.05 + c.bobOffset) * 2;
  // Base growth scale from hen level
  const growthScale = Math.min(1.8, 1.0 + (c.level - 1) * 0.15);
  let scale = growthScale;
  let angle = 0;

  if (isActive && eggsLeft > 0 && state === 'playing') {
    // Excited/vibrating laying animation
    bob += Math.sin(t * 0.4) * 1.5;
    scale = (1.06 + Math.sin(t * 0.25) * 0.04) * growthScale;
    angle = Math.sin(t * 0.3) * 0.03;
  }

  const cx = c.x, cy = c.y + bob;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.rotate(angle);

  // Body
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Wing detail
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.ellipse(8, 2, 12, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.arc(0, -22, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Comb (red)
  ctx.fillStyle = '#e53e3e';
  for(let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-4 + i * 4, -34 + (i === 1 ? -3 : 0), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wattle
  ctx.fillStyle = '#e53e3e';
  ctx.beginPath();
  ctx.ellipse(3, -16, 4, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#f6a623';
  ctx.beginPath();
  ctx.moveTo(12, -22);
  ctx.lineTo(20, -24);
  ctx.lineTo(20, -20);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(6, -24, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(7, -25, 1, 0, Math.PI * 2);
  ctx.fill();

  // Feet
  ctx.strokeStyle = '#f6a623';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 16); ctx.lineTo(-8, 24);
  ctx.moveTo(-8, 24); ctx.lineTo(-14, 24);
  ctx.moveTo(-8, 24); ctx.lineTo(-8, 28);
  ctx.moveTo(8, 16); ctx.lineTo(8, 24);
  ctx.moveTo(8, 24); ctx.lineTo(2, 24);
  ctx.moveTo(8, 24); ctx.lineTo(14, 24);
  ctx.stroke();

  // Highlight laying indicator
  if (isActive && eggsLeft > 0 && state === 'playing') {
    // Draw a small glowing ring under the chicken to highlight it
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 18, 30, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // Draw name and level above chicken in screen coordinates
  if (state === 'playing') {
    ctx.save();
    
    const badgeOffset = 38 + growthScale * 12;
    const badgeY = cy - badgeOffset;
    
    // 1. Level text
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(cx - 42, badgeY - 8, 84, 16, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fde68a';
    ctx.font = "bold 9px 'Fredoka One', cursive";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lvl ${c.level} ${c.name}`, cx, badgeY);
    
    // 2. Feed bubble
    const isAffordable = money >= c.feedCost;
    ctx.fillStyle = isAffordable ? 'rgba(74, 222, 128, 0.95)' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(cx - 30, badgeY + 11, 60, 13, 5);
    ctx.fill();
    
    ctx.fillStyle = isAffordable ? '#052e16' : 'rgba(255, 255, 255, 0.5)';
    ctx.font = "bold 8px 'Fredoka One', cursive";
    ctx.fillText(`🌾 $${c.feedCost}`, cx, badgeY + 18);
    
    ctx.restore();
  }
}

function drawEgg(egg) {
  const type = EGG_TYPES[egg.type];
  ctx.save();
  ctx.translate(egg.x, egg.y);
  ctx.rotate(egg.rot || 0);

  // Egg body
  const grad = ctx.createRadialGradient(-egg.w * 0.2, -egg.h * 0.2, 1, 0, 0, egg.w * 0.8);
  grad.addColorStop(0, lightenColor(type.color, 30));
  grad.addColorStop(1, type.color);
  ctx.fillStyle = grad;
  drawEggShape(ctx, 0, 0, egg.w, egg.h);
  ctx.fill();

  ctx.strokeStyle = type.stroke;
  ctx.lineWidth = 1.5;
  drawEggShape(ctx, 0, 0, egg.w, egg.h);
  ctx.stroke();

  // Golden shimmer
  if(type.golden) {
    ctx.strokeStyle = 'rgba(255,255,180,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-egg.w * 0.2, -egg.h * 0.1, egg.w * 0.15, egg.h * 0.25, -0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEggShape(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.closePath();
}

function drawBasket() {
  const bx = basket.x, by = basket.y;
  const bw = basket.width, bh = basket.height;

  // Get current upgrade colors
  const upgrade = BASKET_UPGRADES[basketLevel - 1] || BASKET_UPGRADES[0];

  // Basket shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(bx, by + bh * 0.45, bw * 0.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Handle
  ctx.strokeStyle = '#8B5E3C';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(bx, by - bh * 0.1, bw * 0.35, Math.PI, 0);
  ctx.stroke();

  // Basket body (trapezoid)
  ctx.fillStyle = upgrade.color;
  ctx.beginPath();
  ctx.moveTo(bx - bw * 0.5, by - bh * 0.2);
  ctx.lineTo(bx - bw * 0.4, by + bh * 0.45);
  ctx.lineTo(bx + bw * 0.4, by + bh * 0.45);
  ctx.lineTo(bx + bw * 0.5, by - bh * 0.2);
  ctx.closePath();
  ctx.fill();

  // Weave lines horizontal
  ctx.strokeStyle = upgrade.rimColor;
  ctx.lineWidth = 1.5;
  for(let row = 0; row < 4; row++) {
    const t = row / 3;
    const y1 = by - bh * 0.2 + bh * 0.65 * t;
    const leftX = bx - bw * 0.5 + bw * 0.1 * t;
    const rightX = bx + bw * 0.5 - bw * 0.1 * t;
    ctx.beginPath();
    ctx.moveTo(leftX, y1);
    ctx.lineTo(rightX, y1);
    ctx.stroke();
  }

  // Weave lines vertical
  for(let col = -3; col <= 3; col++) {
    ctx.beginPath();
    ctx.moveTo(bx + col * (bw * 0.14), by - bh * 0.2);
    ctx.lineTo(bx + col * (bw * 0.11), by + bh * 0.45);
    ctx.stroke();
  }

  // Rim
  ctx.fillStyle = upgrade.rimColor;
  ctx.fillRect(bx - bw * 0.52, by - bh * 0.2 - 4, bw * 1.04, 8);
  ctx.beginPath();
  ctx.roundRect(bx - bw * 0.52, by - bh * 0.2 - 4, bw * 1.04, 8, 4);
  ctx.fill();
}

function drawCrack(x, y) {
  ctx.save();
  ctx.translate(x, y);
  // Broken egg pieces
  ctx.fillStyle = '#fffde7';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(0, -4);
  ctx.lineTo(8, -12);
  ctx.lineTo(14, 0);
  ctx.lineTo(8, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e0c97a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Yolk
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(0, 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffed4a';
  ctx.beginPath();
  ctx.arc(-1, 1, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

// ─── Particles ───────────────────────────────────────────────────────────────
function spawnCatchParticles(x, y, color) {
  for(let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 1,
      size: 3 + Math.random() * 4,
      type: 'star'
    });
  }
}

function spawnBreakParticles(x, y) {
  for(let i = 0; i < 8; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: -Math.random() * 5,
      color: '#ffd700',
      life: 1,
      size: 4 + Math.random() * 6,
      type: 'yolk',
      gravity: 0.3
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if(p.gravity) p.vy += p.gravity;
    p.vx *= 0.95;
    p.life -= 0.03;
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    if(p.type === 'star') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if(p.type === 'heart') {
      ctx.beginPath();
      const hs = p.size;
      ctx.moveTo(p.x, p.y + hs * 0.3);
      ctx.bezierCurveTo(p.x - hs * 0.7, p.y - hs * 0.7, p.x - hs * 1.2, p.y + hs * 0.2, p.x, p.y + hs * 1.1);
      ctx.bezierCurveTo(p.x + hs * 1.2, p.y + hs * 0.2, p.x + hs * 0.7, p.y - hs * 0.7, p.x, p.y + hs * 0.3);
      ctx.fill();
    } else if(p.type === 'coin') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

// ─── Floating text ────────────────────────────────────────────────────────────
function spawnFloatText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 1, vy: -1.5 });
}

function updateFloatTexts() {
  floatingTexts = floatingTexts.filter(t => t.life > 0);
  floatingTexts.forEach(t => { t.y += t.vy; t.life -= 0.02; });
}

function drawFloatTexts() {
  floatingTexts.forEach(t => {
    ctx.save();
    ctx.globalAlpha = t.life;
    ctx.fillStyle = t.color;
    ctx.font = `bold 22px 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
}

// ─── Game Logic ───────────────────────────────────────────────────────────────
function getLevelConfig() {
  return {
    eggSpeed: 1.5 + (level - 1) * 0.45,
    spawnRate: Math.max(25, 90 - (level - 1) * 9),
    goldenChance: Math.min(0.35, 0.1 + (level - 1) * 0.03)
  };
}

function spawnEgg(chickenIdx) {
  const chicken = chickens[chickenIdx];
  const cfg = getLevelConfig();
  let type = 0;
  
  // Base chances modified by chicken level
  let goldenChance = cfg.goldenChance;
  let bonusChance = 0.15;
  
  goldenChance += (chicken.level - 1) * 0.04;
  bonusChance += (chicken.level - 1) * 0.03;
  
  const r = Math.random();
  if(r < goldenChance) type = 1;
  else if(r < goldenChance + bonusChance) type = 2;
  
  const eggType = EGG_TYPES[type];
  eggs.push({
    x: chicken.x,
    y: chicken.y + 10,
    w: 22,
    h: 28,
    vy: (cfg.eggSpeed + Math.random() * 0.5) * eggType.speed,
    type,
    rot: (Math.random() - 0.5) * 0.3,
    rotV: (Math.random() - 0.5) * 0.05,
    id: Math.random()
  });
}

let eggCracks = [];

function update() {
  if(state !== 'playing') return;
  frameCount++;

  const cfg = getLevelConfig();

  // Move clouds
  clouds.forEach(c => { c.x = (c.x + c.speed) % (W + 100); });

  // Move butterflies
  butterflies.forEach(b => {
    b.x += b.vx;
    b.y += Math.sin(frameCount * 0.05 + b.angle) * 0.5;
    if (b.x > W + 50) {
      b.x = -30;
      b.y = 100 + Math.random() * 200;
    }
  });

  // Basket movement
  const targetX = useHandTracking ? handX : mouseX;
  basket.targetX = Math.max(basket.width / 2, Math.min(W - basket.width / 2, targetX));
  if (useHandTracking) {
    basket.x += (basket.targetX - basket.x) * 0.18;
  } else {
    basket.x = basket.targetX;
  }

  // Spawn eggs in sequence
  if (layDelayTimer > 0) {
    layDelayTimer--;
  } else {
    if (eggsToLay > 0) {
      // Current chicken lays an egg!
      spawnEgg(currentChickenIdx);
      if (typeof playSound === 'function') playSound('hen'); // Trigger hen clucking sound!
      eggsToLay--;
      
      if (eggsToLay > 0) {
        // If there's another egg to lay, set a brief delay (reduced for higher level chickens)
        const speedBonus = (chickens[currentChickenIdx].level - 1) * 3;
        layDelayTimer = Math.max(12, 45 - (level - 1) * 2 - speedBonus);
      } else {
        // Chicken is done laying its eggs. Move to a random different chicken.
        const prevChickenIdx = currentChickenIdx;
        let nextIdx = currentChickenIdx;
        while (nextIdx === currentChickenIdx) {
          nextIdx = Math.floor(Math.random() * NUM_CHICKENS);
        }
        currentChickenIdx = nextIdx;
        
        // Determine eggs to lay based on level (difficulty increases)
        let maxEggs = 2;
        if (level >= 8) maxEggs = 4;
        else if (level >= 4) maxEggs = 3;
        
        let minEggs = 1;
        if (level >= 8) minEggs = 2;
        
        eggsToLay = Math.floor(Math.random() * (maxEggs - minEggs + 1)) + minEggs;
        
        // Calculate the distance in indices between the previous and next chicken (ranges from 1 to 4)
        const distance = Math.abs(currentChickenIdx - prevChickenIdx);
        // Add a travel bonus delay based on distance to give the player fair time to move the basket
        const travelBonus = distance * 8;
        
        // Set the delay before the next chicken starts laying (reduced for higher level chickens)
        const nextChicken = chickens[currentChickenIdx];
        const nextSpeedBonus = (nextChicken.level - 1) * 4;
        layDelayTimer = Math.max(15, cfg.spawnRate + travelBonus + Math.random() * 15 - nextSpeedBonus);
      }
    } else {
      // Fallback
      let maxEggs = 2;
      if (level >= 8) maxEggs = 4;
      else if (level >= 4) maxEggs = 3;
      let minEggs = 1;
      if (level >= 8) minEggs = 2;
      eggsToLay = Math.floor(Math.random() * (maxEggs - minEggs + 1)) + minEggs;
      layDelayTimer = cfg.spawnRate;
    }
  }

  // Update eggs
  eggs.forEach(egg => {
    egg.y += egg.vy;
    egg.rot += egg.rotV;

    // Catch check
    const bLeft = basket.x - basket.width * 0.45;
    const bRight = basket.x + basket.width * 0.45;
    const bTop = basket.y - basket.height * 0.2;

    if(egg.y + egg.h / 2 >= bTop && egg.y - egg.h / 2 < bTop + 20 &&
       egg.x >= bLeft && egg.x <= bRight && !egg.caught) {
      egg.caught = true;
      combo++;
      comboTimer = 120;
      const type = EGG_TYPES[egg.type];
      const pts = type.points * (combo >= 3 ? 2 : 1);
      score += pts;
      document.getElementById('scoreVal').textContent = score;

      totalEggsCaught++;
      eggsCaughtThisLevel++;
      document.getElementById('totalEggsVal').textContent = totalEggsCaught;
      
      // Calculate cash value of this egg
      let eggVal = 1; // standard
      if (type.golden) eggVal = 5;
      else if (type.bonus) eggVal = 3;
      
      currentBasketValue += eggVal;
      
      document.getElementById('basket-bar').style.width = ((eggsCaughtThisLevel / basketCapacity) * 100) + '%';
      document.getElementById('basket-text').textContent = eggsCaughtThisLevel + ' / ' + basketCapacity + ' eggs ($' + currentBasketValue + ')';

      // If it's a bonus pink egg, reward a life!
      if (type.bonus) {
        if (lives < MAX_LIVES) {
          lives++;
          updateLives();
          if (typeof playSound === 'function') playSound('life');
          spawnFloatText(egg.x, egg.y - 45, '+1 Life 💖', '#ff6b9d');
        } else {
          const extraPts = 5;
          score += extraPts;
          document.getElementById('scoreVal').textContent = score;
          if (typeof playSound === 'function') playSound('catch');
          spawnFloatText(egg.x, egg.y - 45, `+${extraPts} Full Lives! 💖`, '#ff6b9d');
        }
      } else {
        if (typeof playSound === 'function') playSound('catch');
      }

      spawnCatchParticles(egg.x, egg.y, type.golden ? '#ffd700' : type.bonus ? '#ff6b9d' : '#a8e6cf');
      const label = combo >= 3 ? `+${pts} 🔥` : `+${pts}`;
      spawnFloatText(egg.x, egg.y - 20, label, type.golden ? '#ffd700' : '#ffffff');
      
      updateShopUI();

      if(eggsCaughtThisLevel >= basketCapacity) {
        // Complete the basket!
        stackedBaskets.push({
          capacity: basketCapacity,
          value: currentBasketValue
        });
        
        eggsCaughtThisLevel = 0;
        currentBasketValue = 0;

        level++;
        document.getElementById('levelVal').textContent = level;
        
        // Reset progress bar
        document.getElementById('basket-bar').style.width = '0%';
        document.getElementById('basket-text').textContent = '0 / ' + basketCapacity + ' eggs ($0)';
        
        // Prominent Level Up UI screen banner!
        const lvlScreen = document.getElementById('level-up-screen');
        document.getElementById('level-up-subtitle').textContent = `Level ${level} reached!`;
        lvlScreen.classList.add('active');
        if (typeof playSound === 'function') playSound('levelup');
        
        // Clear active banner after 2 seconds
        if (window.levelUpTimeout) clearTimeout(window.levelUpTimeout);
        window.levelUpTimeout = setTimeout(() => {
          lvlScreen.classList.remove('active');
        }, 2000);

        spawnFloatText(W/2, H/2 - 60, `LEVEL ${level}!`, '#fbbf24');
        
        updateShopUI();
      }
    }
  });

  // Combo timer
  if(comboTimer > 0) {
    comboTimer--;
    document.getElementById('combo-display').classList.add('active');
    document.getElementById('comboVal').textContent = combo;
  } else {
    combo = 0;
    document.getElementById('combo-display').classList.remove('active');
  }

  // Remove caught eggs
  const droppedEggs = eggs.filter(e => !e.caught && e.y - e.h / 2 > H - 95);
  droppedEggs.forEach(e => {
    lives = Math.max(0, lives - 1);
    updateLives();
    shakeTimer = 20;
    eggCracks.push({ x: e.x, y: H - 110, life: 180 });
    spawnBreakParticles(e.x, H - 110);
    spawnFloatText(e.x, H - 140, '💔 -1', '#ef4444');
    if(lives <= 0) {
      if (typeof playSound === 'function') playSound('gameover');
      endGame();
    } else {
      if (typeof playSound === 'function') playSound('break');
    }
  });

  eggs = eggs.filter(e => !e.caught && e.y - e.h / 2 <= H - 95);
  eggCracks = eggCracks.filter(c => { c.life--; return c.life > 0; });

  updateParticles();
  updateFloatTexts();

  if(shakeTimer > 0) shakeTimer--;
}

// ─── Shop & upgrades ──────────────────────────────────────────────────────────
function drawStackedBaskets() {
  const startX = W - 100;
  const startY = H - 100;
  
  stackedBaskets.forEach((basketData, i) => {
    // Stack upwards: each basket is offset by 18px vertically
    const bx = startX;
    const by = startY - i * 18;
    const bw = 50; // slightly smaller basket representation
    const bh = 30;
    
    ctx.save();
    ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
    ctx.shadowBlur = 4;
    
    // Handle
    ctx.strokeStyle = '#8B5E3C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by - bh * 0.1, bw * 0.35, Math.PI, 0);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#c47c3a';
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.5, by - bh * 0.2);
    ctx.lineTo(bx - bw * 0.4, by + bh * 0.45);
    ctx.lineTo(bx + bw * 0.4, by + bh * 0.45);
    ctx.lineTo(bx + bw * 0.5, by - bh * 0.2);
    ctx.closePath();
    ctx.fill();

    // Rim
    ctx.fillStyle = '#a3611e';
    ctx.beginPath();
    ctx.roundRect(bx - bw * 0.52, by - bh * 0.2 - 2, bw * 1.04, 4, 2);
    ctx.fill();

    // Draw eggs sticking out
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(bx - 8, by - bh * 0.2, 4, 0, Math.PI*2);
    ctx.arc(bx, by - bh * 0.2 - 2, 4, 0, Math.PI*2);
    ctx.arc(bx + 8, by - bh * 0.2, 4, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  });
  
  if (stackedBaskets.length > 0) {
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = "bold 11px 'Fredoka One', cursive";
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(`${stackedBaskets.length} Full Basket${stackedBaskets.length > 1 ? 's' : ''}`, startX, startY - stackedBaskets.length * 18 - 15);
    ctx.restore();
  }
}

function feedChicken(idx) {
  const c = chickens[idx];
  if (money >= c.feedCost) {
    money -= c.feedCost;
    c.level++;
    
    // Scale feed cost
    c.feedCost = Math.floor(10 * Math.pow(1.6, c.level - 1));
    
    // Animate feeding
    spawnFloatText(c.x, c.y - 40, `Level Up! Lvl ${c.level} 🐔`, '#4ade80');
    if (typeof playSound === 'function') playSound('feed');
    spawnHeartParticles(c.x, c.y);
    
    // Update UI
    document.getElementById('moneyVal').textContent = '$' + money;
    updateShopUI();
  } else {
    spawnFloatText(c.x, c.y - 45, `Need $${c.feedCost}! 💰`, '#f87171');
  }
}

function spawnHeartParticles(x, y) {
  for(let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 2;
    particles.push({
      x, y: y - 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      color: '#ff6b9d',
      life: 1,
      size: 4 + Math.random() * 4,
      type: 'heart'
    });
  }
}

function sellStackedBaskets() {
  if (stackedBaskets.length === 0) return;
  
  let totalCash = 0;
  stackedBaskets.forEach(b => {
    totalCash += b.value;
  });
  
  money += totalCash;
  stackedBaskets = [];
  
  if (typeof playSound === 'function') playSound('coin');
  document.getElementById('moneyVal').textContent = '$' + money;
  
  spawnFloatText(W - 100, H - 150, `+$${totalCash}! 💰`, '#4ade80');
  
  // Coin particles
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: W - 100 + (Math.random() - 0.5) * 40,
      y: H - 120 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 4,
      vy: -2 - Math.random() * 4,
      color: '#ffd700',
      life: 1,
      size: 4 + Math.random() * 3,
      type: 'coin'
    });
  }
  
  updateShopUI();
}

function upgradeBasket() {
  if (basketLevel >= 5) return;
  const upgrade = BASKET_UPGRADES[basketLevel]; // index basketLevel is the next level (starts at 1)
  if (money >= upgrade.cost) {
    money -= upgrade.cost;
    basketLevel++;
    basketCapacity = upgrade.capacity;
    
    // Apply upgraded properties to active basket
    basket.width = 90 + (basketLevel - 1) * 8;
    
    if (typeof playSound === 'function') playSound('levelup');
    document.getElementById('moneyVal').textContent = '$' + money;
    spawnFloatText(basket.x, basket.y - 40, `Upgraded Basket! 🧺`, '#fbbf24');
    
    // Sparkles
    spawnCatchParticles(basket.x, basket.y, '#fbbf24');
    
    // Update texts & values
    document.getElementById('basket-bar').style.width = ((eggsCaughtThisLevel / basketCapacity) * 100) + '%';
    document.getElementById('basket-text').textContent = eggsCaughtThisLevel + ' / ' + basketCapacity + ' eggs ($' + currentBasketValue + ')';
    
    updateShopUI();
  } else {
    spawnFloatText(basket.x, basket.y - 40, `Need $${upgrade.cost}! 💰`, '#f87171');
  }
}

function updateShopUI() {
  const basketCostEl = document.getElementById('basket-cost');
  const basketDescEl = document.getElementById('basket-desc');
  const basketBtn = document.getElementById('upgrade-basket-btn');
  
  if (basketLevel >= 5) {
    basketCostEl.textContent = 'MAX';
    basketDescEl.textContent = `Cap: ${basketCapacity} | Level 5 (Max)`;
    basketBtn.disabled = true;
  } else {
    const nextCfg = BASKET_UPGRADES[basketLevel];
    basketCostEl.textContent = `$${nextCfg.cost}`;
    basketDescEl.textContent = `Cap: ${nextCfg.capacity} | Lvl ${basketLevel} ➔ ${nextCfg.level}`;
    basketBtn.disabled = money < nextCfg.cost;
  }
  
  const sellBtn = document.getElementById('sell-baskets-btn');
  const sellDesc = document.getElementById('stacked-desc');
  const sellValue = document.getElementById('stacked-value');
  
  if (stackedBaskets.length > 0) {
    let totalVal = 0;
    stackedBaskets.forEach(b => totalVal += b.value);
    
    sellBtn.disabled = false;
    sellDesc.textContent = `${stackedBaskets.length} basket${stackedBaskets.length > 1 ? 's' : ''} stacked`;
    sellValue.textContent = `+$${totalVal}`;
  } else {
    sellBtn.disabled = true;
    sellDesc.textContent = '0 baskets stacked';
    sellValue.textContent = '+$0';
  }
}

function updateLives() {
  const container = document.getElementById('lives-display');
  if (!container) return;
  container.innerHTML = '';
  for(let i = 0; i < MAX_LIVES; i++) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `life-egg ${i >= lives ? 'lost' : ''}`);
    svg.setAttribute('viewBox', '-14 -18 28 36');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '36');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,-14 C7,-14 12,-7 12,4 C12,14 7,17 0,17 C-7,17 -12,14 -12,4 C-12,-7 -7,-14 0,-14 Z');
    path.setAttribute('fill', i < lives ? '#ffd700' : '#555');
    path.setAttribute('stroke', i < lives ? '#b8860b' : '#333');
    path.setAttribute('stroke-width', '1.5');
    svg.appendChild(path);
    container.appendChild(svg);
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  ctx.save();
  if(shakeTimer > 0) {
    ctx.translate(
      (Math.random() - 0.5) * 6 * (shakeTimer / 20),
      (Math.random() - 0.5) * 6 * (shakeTimer / 20)
    );
  }

  drawBackground();

  // Egg cracks on ground
  eggCracks.forEach(c => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, c.life / 60);
    drawCrack(c.x, c.y);
    ctx.restore();
  });

  // Chickens
  chickens.forEach((c, i) => drawChicken(c, frameCount, i === currentChickenIdx, eggsToLay));

  // Eggs
  eggs.forEach(e => drawEgg(e));

  // Basket
  drawBasket();
  
  // Stacked baskets on the side
  drawStackedBaskets();

  // Particles & float texts
  drawParticles();
  drawFloatTexts();

  // Hand tracking cursor dot
  if(useHandTracking && state === 'playing') {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(handX, basket.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,100,100,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ─── Game flow ────────────────────────────────────────────────────────────────
function startGame(withHand) {
  useHandTracking = withHand;
  score = 0;
  lives = 3;
  level = 1;
  combo = 0;
  comboTimer = 0;
  totalEggsCaught = 0;
  eggsCaughtThisLevel = 0;
  money = 0;
  currentBasketValue = 0;
  stackedBaskets = [];
  basketCapacity = 30;
  basketLevel = 1;
  basket.width = 90;
  
  // Reset chicken upgrades
  chickens.forEach(c => {
    c.level = 1;
    c.feedCost = 10;
  });

  eggs = [];
  particles = [];
  floatingTexts = [];
  eggCracks = [];
  frameCount = 0;
  basket.x = W / 2;
  
  document.getElementById('scoreVal').textContent = '0';
  document.getElementById('totalEggsVal').textContent = '0';
  document.getElementById('moneyVal').textContent = '$0';
  document.getElementById('levelVal').textContent = '1';
  document.getElementById('basket-bar').style.width = '0%';
  document.getElementById('basket-text').textContent = '0 / 30 eggs ($0)';
  document.getElementById('level-up-screen').classList.remove('active');
  
  updateLives();
  updateShopUI();

  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('gameover-screen').style.display = 'none';
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('pause-btn').style.display = 'flex';
  document.getElementById('pause-btn').textContent = '⏸';
  document.getElementById('pause-btn').title = 'Pause Game';
  currentChickenIdx = Math.floor(Math.random() * NUM_CHICKENS);
  eggsToLay = Math.random() < 0.5 ? 1 : 2;
  layDelayTimer = 40; // Short initial delay
  state = 'playing';

  // Autoplay music upon game start (using user click interaction)
  if (!window.musicStarted && typeof startMusic === 'function') {
    startMusic();
  }
}

function endGame() {
  state = 'gameover';
  if(score > bestScore) {
    bestScore = score;
    localStorage.setItem('eggBest', bestScore);
  }
  document.getElementById('gameover-score').textContent = score;
  document.getElementById('bestVal').textContent = bestScore;
  document.getElementById('gameover-screen').style.display = 'flex';
  document.getElementById('pause-btn').style.display = 'none';
  document.getElementById('pause-screen').style.display = 'none';
}

// ─── Controls ─────────────────────────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if(!useHandTracking) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
  }
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if(!useHandTracking) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.touches[0].clientX - rect.left) * (W / rect.width);
  }
}, { passive: false });

// Feed chickens on click, or sell stacked baskets on click
canvas.addEventListener('click', e => {
  if (state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (W / rect.width);
  const clickY = (e.clientY - rect.top) * (H / rect.height);
  
  // 1. Check if clicked near a chicken
  for (let i = 0; i < chickens.length; i++) {
    const c = chickens[i];
    const dx = clickX - c.x;
    const dy = clickY - c.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 40) {
      feedChicken(i);
      return;
    }
  }
  
  // 2. Check if clicked stacked baskets stack on the right side
  const startX = W - 100;
  if (stackedBaskets.length > 0 && Math.abs(clickX - startX) < 40 && clickY > H - 150 && clickY < H - 50) {
    sellStackedBaskets();
    return;
  }
});

document.getElementById('upgrade-basket-btn').addEventListener('click', () => {
  upgradeBasket();
});

document.getElementById('sell-baskets-btn').addEventListener('click', () => {
  sellStackedBaskets();
});

document.getElementById('startBtn').addEventListener('click', () => {
  if (typeof initHandTracking === 'function') {
    initHandTracking(() => startGame(true));
  } else {
    startGame(false);
  }
});

document.getElementById('mouseBtn').addEventListener('click', () => {
  startGame(false);
});

document.getElementById('restartBtn').addEventListener('click', () => {
  startGame(useHandTracking);
});

// Pause controls
function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    document.getElementById('pause-screen').style.display = 'flex';
    document.getElementById('pause-btn').textContent = '▶';
    document.getElementById('pause-btn').title = 'Resume Game';
  } else if (state === 'paused') {
    state = 'playing';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('pause-btn').textContent = '⏸';
    document.getElementById('pause-btn').title = 'Pause Game';
  }
}

document.getElementById('pause-btn').addEventListener('click', e => {
  e.stopPropagation();
  togglePause();
});

document.getElementById('resumeBtn').addEventListener('click', () => {
  togglePause();
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    togglePause();
  }
});

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  W = canvas.width;
  H = canvas.height;

  basket.y = H - 85;

  // Reposition chickens relative to the new width
  chickens.forEach((c, i) => {
    c.x = (W / (NUM_CHICKENS + 1)) * (i + 1);
  });

  // Regenerate grass blades to span the new width
  grassBlades = Array.from({length: Math.floor(W / 15)}, () => ({
    x: Math.random() * W,
    h: 8 + Math.random() * 14,
    lean: (Math.random() - 0.5) * 0.4
  }));

  // Regenerate flowers to span the new width
  flowers = Array.from({length: Math.floor(W / 60)}, () => ({
    x: Math.random() * W,
    y: H - 90 + Math.random() * 70,
    color: ['#f43f5e', '#ec4899', '#3b82f6', '#fbbf24', '#a855f7'][Math.floor(Math.random() * 5)],
    size: 3 + Math.random() * 3
  }));

  // Regenerate butterflies
  butterflies = Array.from({length: 3}, () => ({
    x: Math.random() * W,
    y: 100 + Math.random() * 200,
    vx: 0.5 + Math.random() * 0.8,
    vy: 0,
    color: ['#f43f5e', '#fb7185', '#38bdf8', '#fbbf24', '#c084fc'][Math.floor(Math.random() * 5)],
    scale: 0.6 + Math.random() * 0.4,
    angle: Math.random() * Math.PI * 2
  }));

  // Re-adjust cloud positions to fit the new screen width
  clouds.forEach(c => {
    if (c.x > W) {
      c.x = Math.random() * W;
    }
  });

  // Keep basket on screen
  basket.x = Math.max(basket.width / 2, Math.min(W - basket.width / 2, basket.x));
}

window.addEventListener('resize', resizeCanvas);
// Call resizeCanvas initially to set up correct size
resizeCanvas();

// ─── Boot ─────────────────────────────────────────────────────────────────────
updateLives();
gameLoop();
