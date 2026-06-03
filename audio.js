// ─── Sound Effects ────────────────────────────────────────────────────────────
const sounds = {
  catch: new Audio('assets/sounds/catch.wav'),
  break: new Audio('assets/sounds/break.wav'),
  life: new Audio('assets/sounds/life.wav'),
  gameover: new Audio('assets/sounds/gameover.wav'),
  levelup: new Audio('assets/sounds/levelup.wav')
};

sounds.catch.volume = 0.8;
sounds.break.volume = 0.8;
sounds.life.volume = 0.7;
sounds.gameover.volume = 0.8;
sounds.levelup.volume = 0.8;

let audioCtx = null;

function playHenSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // A hen cluck consists of 2 quick pitch sweeps (double cluck)
    function triggerCluck(time, startFreq, duration) {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'triangle';
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, time);
      filter.Q.setValueAtTime(2.5, time);

      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.45, time + duration);

      gainNode.gain.setValueAtTime(0.01, time);
      gainNode.gain.linearRampToValueAtTime(0.25, time + duration * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(time);
      osc.stop(time + duration);
    }

    // Double cluck "cluck-cluck!"
    triggerCluck(now, 680, 0.09);
    triggerCluck(now + 0.08, 620, 0.12);
  } catch (e) {
    console.warn("Failed to synthesize hen sound:", e);
  }
}

function playSound(name) {
  if (name === 'hen') {
    playHenSound();
    return;
  }
  const sound = sounds[name];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(err => console.warn("Sound play blocked:", err));
  }
}

// ─── YouTube Background Music Player Logic ────────────────────────────────────
let ytPlayer;
let isMusicMuted = false;

// Load YouTube IFrame Player API dynamically
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Bind API callback to window so it is accessible globally by YouTube's script
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('yt-player', {
    videoId: 'tlgmhEr-eK4',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      loop: 1,
      playlist: 'tlgmhEr-eK4', // Loop video ID
      modestbranding: 1,
      rel: 0
    },
    events: {
      onReady: onPlayerReady
    }
  });
};

function onPlayerReady(event) {
  event.target.setVolume(70);
}

function startMusic() {
  if (ytPlayer && typeof ytPlayer.playVideo === 'function' && !window.musicStarted) {
    ytPlayer.playVideo();
    window.musicStarted = true;
    const btn = document.getElementById('music-btn');
    if (btn) btn.textContent = '🎵';
  }
}

function toggleMusic() {
  if (!window.musicStarted) {
    startMusic();
    return;
  }

  if (ytPlayer && typeof ytPlayer.mute === 'function') {
    const btn = document.getElementById('music-btn');
    if (isMusicMuted) {
      ytPlayer.unmute();
      isMusicMuted = false;
      if (btn) {
        btn.textContent = '🎵';
        btn.title = 'Mute Music';
      }
    } else {
      ytPlayer.mute();
      isMusicMuted = true;
      if (btn) {
        btn.textContent = '🔇';
        btn.title = 'Unmute Music';
      }
    }
  }
}

// Expose functions and state variables to index.html globally
window.playSound = playSound;
window.startMusic = startMusic;
window.musicStarted = false;

// Bind music button click listener once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('music-btn');
  if (btn) {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleMusic();
    });
  }
});
