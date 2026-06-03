// ─── PeerJS P2P Cooperative Multiplayer ──────────────────────────────────────

let peer = null;
let p2pConn = null;

// Multiplayer variables on window for game.js to access
window.isMultiplayer = false;
window.isHost = false;
window.remoteBasketX = 0;
window.remoteBasketLevel = 1;

// Initialize PeerJS once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setupMultiplayerUI();
  initPeer();
});

function initPeer() {
  const myIdEl = document.getElementById('my-peer-id');
  const statusEl = document.getElementById('connection-status');
  
  // Create a PeerJS peer (uses PeerJS cloud signaling by default)
  peer = new Peer();
  
  peer.on('open', (id) => {
    myIdEl.textContent = id;
    statusEl.textContent = 'Ready for connection. Share your ID or connect to a friend!';
    statusEl.className = 'connection-status';
  });
  
  peer.on('error', (err) => {
    console.error('PeerJS error:', err);
    statusEl.textContent = '❌ Connection error: ' + err.type;
    statusEl.className = 'connection-status error';
  });
  
  // Handle incoming connections (acting as Host)
  peer.on('connection', (conn) => {
    if (p2pConn) {
      conn.close(); // Only allow 1 opponent in co-op
      return;
    }
    p2pConn = conn;
    setupConnection(true);
  });
}

// Set up UI interactions
function setupMultiplayerUI() {
  const connectBtn = document.getElementById('connect-btn');
  const friendIdInput = document.getElementById('friend-id-input');
  const copyBtn = document.getElementById('copy-id-btn');
  const statusEl = document.getElementById('connection-status');
  
  copyBtn.addEventListener('click', () => {
    const myIdText = document.getElementById('my-peer-id').textContent;
    if (myIdText && myIdText !== 'Loading...') {
      navigator.clipboard.writeText(myIdText).then(() => {
        const origText = copyBtn.textContent;
        copyBtn.textContent = '✓';
        setTimeout(() => copyBtn.textContent = origText, 1500);
      });
    }
  });
  
  connectBtn.addEventListener('click', () => {
    const friendId = friendIdInput.value.trim();
    if (!friendId) {
      statusEl.textContent = '⚠️ Please enter a friend\'s ID first.';
      statusEl.className = 'connection-status error';
      return;
    }
    
    if (p2pConn) {
      statusEl.textContent = 'Already connected or connecting.';
      return;
    }
    
    statusEl.textContent = 'Connecting to ' + friendId + '...';
    statusEl.className = 'connection-status loading';
    
    // Connect to friend (acting as Guest)
    p2pConn = peer.connect(friendId, { reliable: true });
    
    setupConnection(false);
  });
}

function setupConnection(isHost) {
  const statusEl = document.getElementById('connection-status');
  
  p2pConn.on('open', () => {
    window.isMultiplayer = true;
    window.isHost = isHost;
    
    statusEl.textContent = `✅ Connected! Player is ${isHost ? 'Host (P1)' : 'Guest (P2)'}.`;
    statusEl.className = 'connection-status success';
    
    // Hide standard single-player buttons, replace play flow
    document.getElementById('startBtn').textContent = isHost ? 'START CO-OP GAME' : 'WAITING FOR HOST...';
    
    if (!isHost) {
      document.getElementById('startBtn').disabled = true;
      document.getElementById('mouseBtn').style.display = 'none';
      document.getElementById('friend-id-input').disabled = true;
      document.getElementById('connect-btn').disabled = true;
    } else {
      document.getElementById('mouseBtn').textContent = 'Play with Mouse (Co-op)';
    }
    
    // Set initial values
    window.remoteBasketX = W / 2;
    window.remoteBasketLevel = 1;
  });
  
  p2pConn.on('close', () => {
    handleDisconnect();
  });
  
  p2pConn.on('error', (err) => {
    console.error('Connection error:', err);
    handleDisconnect();
  });
  
  // Handle incoming P2P messages
  p2pConn.on('data', (data) => {
    if (isHost) {
      handleGuestMessage(data);
    } else {
      handleHostMessage(data);
    }
  });
}

function handleDisconnect() {
  window.isMultiplayer = false;
  window.isHost = false;
  p2pConn = null;
  
  const statusEl = document.getElementById('connection-status');
  statusEl.textContent = '⚠️ Player disconnected. Ready for new connection.';
  statusEl.className = 'connection-status error';
  
  // Restore button labels
  const startBtn = document.getElementById('startBtn');
  startBtn.textContent = 'PLAY!';
  startBtn.disabled = false;
  
  const mouseBtn = document.getElementById('mouseBtn');
  mouseBtn.textContent = 'Play with Mouse Instead';
  mouseBtn.style.display = 'inline-block';
  
  document.getElementById('friend-id-input').disabled = false;
  document.getElementById('connect-btn').disabled = false;
  
  // Reset opponent state
  window.remoteBasketX = 0;
  window.remoteBasketLevel = 1;
  
  // Return to menu if playing
  if (state === 'playing') {
    state = 'menu';
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'none';
  }
}

// ─── Host Messaging Handlers ──────────────────────────────────────────────────
function handleGuestMessage(data) {
  switch (data.type) {
    case 'move':
      window.remoteBasketX = data.x;
      window.remoteBasketLevel = data.basketLevel;
      break;
    case 'action':
      if (data.actionType === 'feed_chicken') {
        if (typeof feedChicken === 'function') feedChicken(data.idx);
      } else if (data.actionType === 'upgrade_basket') {
        if (typeof upgradeBasket === 'function') upgradeBasket();
      } else if (data.actionType === 'sell_baskets') {
        if (typeof sellStackedBaskets === 'function') sellStackedBaskets();
      }
      break;
    case 'toggle_pause':
      if (typeof togglePause === 'function') togglePause(true);
      break;
  }
}

// ─── Guest Messaging Handlers ──────────────────────────────────────────────────
function handleHostMessage(data) {
  switch (data.type) {
    case 'sync':
      if (typeof window.setMultiplayerState === 'function') {
        window.setMultiplayerState(data.state);
      }
      break;
    case 'sound':
      if (typeof playSound === 'function') {
        // Bypass broadcast wrapper to prevent feedback loops
        const sound = sounds[data.name];
        if (sound) {
          sound.currentTime = 0;
          sound.play().catch(e => console.warn("Sound play blocked:", e));
        } else if (data.name === 'hen') {
          playHenSound();
        } else if (data.name === 'coin') {
          playCoinSound();
        } else if (data.name === 'feed') {
          playFeedSound();
        }
      }
      break;
    case 'particles':
      if (data.category === 'catch') {
        if (typeof spawnCatchParticles === 'function') spawnCatchParticles(data.x, data.y, data.color);
      } else if (data.category === 'break') {
        if (typeof spawnBreakParticles === 'function') spawnBreakParticles(data.x, data.y);
      } else if (data.category === 'heart') {
        if (typeof spawnHeartParticles === 'function') spawnHeartParticles(data.x, data.y);
      }
      break;
    case 'float_text':
      if (typeof spawnFloatText === 'function') {
        spawnFloatText(data.x, data.y, data.text, data.color);
      }
      break;
    case 'start_game':
      // Start guest's game loop matching host controls
      if (typeof startGame === 'function') {
        startGame(data.withHand);
      }
      break;
    case 'game_over':
      if (typeof endGame === 'function') {
        endGame();
      }
      break;
    case 'toggle_pause':
      if (typeof togglePause === 'function') {
        togglePause(true);
      }
      break;
  }
}

// ─── API Hooks called by game.js ──────────────────────────────────────────────

// Guest sends basket position
window.sendMultiplayerMove = function(x, lvl) {
  if (p2pConn && p2pConn.open && !window.isHost) {
    p2pConn.send({
      type: 'move',
      x: x,
      basketLevel: lvl
    });
  }
};

// Host sends state sync
window.sendMultiplayerSync = function() {
  if (p2pConn && p2pConn.open && window.isHost) {
    p2pConn.send({
      type: 'sync',
      state: {
        eggs: eggs.map(e => ({
          x: e.x, y: e.y, w: e.w, h: e.h, type: e.type, caught: e.caught, rot: e.rot, rotV: e.rotV, id: e.id
        })),
        score: score,
        totalEggsCaught: totalEggsCaught,
        eggsCaughtThisLevel: eggsCaughtThisLevel,
        level: level,
        lives: lives,
        money: money,
        currentBasketValue: currentBasketValue,
        basketLevel: basketLevel,
        basketCapacity: basketCapacity,
        stackedBasketsCount: stackedBaskets.length,
        activeChickenIdx: currentChickenIdx,
        eggsToLay: eggsToLay,
        activeChickenIdx2: currentChickenIdx2,
        eggsToLay2: eggsToLay2,
        hostBasketX: basket.x,
        hostBasketLevel: basketLevel
      }
    });
  }
};

// Guest sends action commands
window.sendMultiplayerAction = function(action) {
  if (p2pConn && p2pConn.open && !window.isHost) {
    p2pConn.send({
      type: 'action',
      actionType: action.type,
      idx: action.idx
    });
  }
};

// Host broadcasts particle & sound effects
window.broadcastMultiplayerEvent = function(event) {
  if (p2pConn && p2pConn.open && window.isHost) {
    p2pConn.send(event);
  }
};

// Host sends start signal
window.sendMultiplayerStartGame = function(withHand) {
  if (p2pConn && p2pConn.open && window.isHost) {
    p2pConn.send({
      type: 'start_game',
      withHand: withHand
    });
  }
};

// Host sends game over signal
window.sendMultiplayerGameOver = function(score) {
  if (p2pConn && p2pConn.open && window.isHost) {
    p2pConn.send({
      type: 'game_over',
      score: score
    });
  }
};

// Toggle Pause signal (both directions)
window.sendMultiplayerTogglePause = function() {
  if (p2pConn && p2pConn.open) {
    p2pConn.send({
      type: 'toggle_pause'
    });
  }
};
