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

function playSound(name) {
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
