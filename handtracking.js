// ─── MediaPipe Hand Tracking & Camera Logic ──────────────────────────────────
let handTrackingReady = false;
let camStream = null;

function initHandTracking(callback) {
  const statusEl = document.getElementById('cam-status');
  statusEl.textContent = '📷 Requesting camera...';
  statusEl.className = '';

  navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
    .then(stream => {
      camStream = stream;
      const webcamEl = document.getElementById('webcam');
      webcamEl.srcObject = stream;
      document.getElementById('webcam-container').style.display = 'block';

      statusEl.textContent = '✅ Hand tracking active';
      statusEl.className = 'active';

      setupMediaPipe(webcamEl, callback);
    })
    .catch(err => {
      console.warn('Camera error:', err);
      statusEl.textContent = '⚠️ No camera — using mouse';
      statusEl.className = 'inactive';
      callback && callback();
      // Fallback to mouse
      if (typeof startGame === 'function') {
        startGame(false);
      }
    });
}

function setupMediaPipe(videoEl, callback) {
  if (typeof Hands === 'undefined') {
    console.warn('MediaPipe not loaded, using mouse');
    callback && callback();
    if (typeof startGame === 'function') {
      startGame(false);
    }
    return;
  }

  const hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5
  });

  const handDisplayCanvas = document.getElementById('handCanvas');
  const hdCtx = handDisplayCanvas.getContext('2d');

  hands.onResults(results => {
    handDisplayCanvas.width = handDisplayCanvas.offsetWidth;
    handDisplayCanvas.height = handDisplayCanvas.offsetHeight;
    hdCtx.clearRect(0, 0, handDisplayCanvas.width, handDisplayCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Use wrist (0) + middle finger base (9) for stable X
      const palmX = (landmarks[0].x + landmarks[5].x + landmarks[9].x) / 3;

      // Map palm X to canvas (mirrored because webcam is mirrored)
      const normalizedX = 1 - palmX;
      // Map safe range [0.15, 0.85] to full screen width [0, 1]
      const minRange = 0.15;
      const maxRange = 0.85;
      const mappedX = Math.max(0, Math.min(1, (normalizedX - minRange) / (maxRange - minRange)));
      
      // Update the global/game variable handX (using W)
      if (typeof W !== 'undefined') {
        handX = mappedX * W;
      }

      // Draw hand dots on mini preview
      hdCtx.fillStyle = 'rgba(255, 100, 100, 0.8)';
      landmarks.forEach(lm => {
        hdCtx.beginPath();
        hdCtx.arc(lm.x * handDisplayCanvas.width, lm.y * handDisplayCanvas.height, 3, 0, Math.PI * 2);
        hdCtx.fill();
      });

      // Draw connections
      const connections = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [5,9],[9,10],[10,11],[11,12],
        [9,13],[13,14],[14,15],[15,16],
        [13,17],[17,18],[18,19],[19,20],
        [0,17]
      ];
      hdCtx.strokeStyle = 'rgba(255,200,100,0.6)';
      hdCtx.lineWidth = 1.5;
      connections.forEach(([a, b]) => {
        hdCtx.beginPath();
        hdCtx.moveTo(landmarks[a].x * handDisplayCanvas.width, landmarks[a].y * handDisplayCanvas.height);
        hdCtx.lineTo(landmarks[b].x * handDisplayCanvas.width, landmarks[b].y * handDisplayCanvas.height);
        hdCtx.stroke();
      });
    }
  });

  const camera = new Camera(videoEl, {
    onFrame: async () => {
      await hands.send({ image: videoEl });
    },
    width: 640,
    height: 480
  });

  camera.start().then(() => {
    handTrackingReady = true;
    callback && callback();
  }).catch(err => {
    console.warn('Camera start error:', err);
    callback && callback();
    if (typeof startGame === 'function') {
      startGame(false);
    }
  });
}
