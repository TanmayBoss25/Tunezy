/* ================================================================
   TUNEZY — MAIN SCRIPT
   THE TRICK: YouTube iframe is rendered at 1x1px with opacity ~0.
   The YT IFrame API still loads and plays the video (audio+video).
   Since the browser can't see opacity:0 blocks audio on mobile,
   we use opacity:0.01 so it's technically "visible" and audio
   keeps playing even when the tab is in the background.
================================================================ */

const API_KEY = 'AIzaSyD1rlVFtogeUy07xlHN7rr-JFYegrK0wM0'; // Replace with your key

let ytPlayer       = null;
let ytReady        = false;
let isPlaying      = false;
let isShuffle      = false;
let isRepeat       = false;
let isMuted        = false;
let currentVolume  = 80;
let progressTimer  = null;
let likedSongs     = [];
let queue          = [];
let queueIndex     = -1;
let currentVideo   = null;
let searchDebounce = null;

/* ---- Greeting ---- */
(function() {
  const h = new Date().getHours();
  const t = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
  document.getElementById('greeting-time').textContent = t;
})();

/* ---- NAVIGATION ---- */
function goTo(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  // Clear all active states
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mobile-nav a').forEach(a => a.classList.remove('active'));

  // Set active on sidebar item matching this page
  document.querySelectorAll('.nav-item').forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if (oc.includes("'" + page + "'") || oc.includes('"' + page + '"')) {
      n.classList.add('active');
    }
  });

  // Set active on mobile nav item matching this page
  document.querySelectorAll('.mobile-nav a').forEach(a => {
    if (a.dataset.page === page) a.classList.add('active');
  });

  // Also highlight the element that was clicked (if it's a nav item)
  if (el && el.classList && el.classList.contains('nav-item')) {
    el.classList.add('active');
  }
}

/* ---- YOUTUBE API ---- */
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('yt-hidden-player', {
    height: '1', width: '1',
    videoId: '',
    playerVars: { playsinline: 1, controls: 0, rel: 0, autoplay: 0 },
    events: {
      onReady: () => { ytReady = true; ytPlayer.setVolume(currentVolume); },
      onStateChange: onYTStateChange
    }
  });
}

function onYTStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    setPlayIcon(true);
    document.getElementById('eq-bars').classList.remove('paused');
    startProgressLoop();
  } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.BUFFERING) {
    isPlaying = false;
    setPlayIcon(false);
    document.getElementById('eq-bars').classList.add('paused');
  } else if (e.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    setPlayIcon(false);
    document.getElementById('eq-bars').classList.add('paused');
    if (isRepeat) { ytPlayer.seekTo(0); ytPlayer.playVideo(); }
    else playNext();
  }
}

function setPlayIcon(playing) {
  const icon = document.getElementById('playIcon');
  icon.className = playing ? 'fas fa-pause' : 'fas fa-play';
}

/* ---- PLAY VIDEO ---- */
function playVideo(videoId, title, channel, thumb) {
  if (!ytReady) { showToast('Player loading…'); return; }
  currentVideo = { videoId, title, channel, thumb };
  ytPlayer.loadVideoById(videoId);
  ytPlayer.setVolume(currentVolume);

  document.getElementById('player-title').textContent   = title;
  document.getElementById('player-channel').textContent = channel;
  const thumbEl = document.getElementById('player-thumb');
  if (thumb) {
    thumbEl.innerHTML = `<img src="${thumb}" alt="thumb">`;
  } else {
    thumbEl.innerHTML = `<i class="fas fa-music"></i>`;
  }

  // Add to recent
  addToRecent({ videoId, title, channel, thumb });
}

/* ---- PLAYER CONTROLS ---- */
function togglePlay() {
  if (!ytReady || !currentVideo) return showToast('Search and play a song first!');
  if (isPlaying) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
}

function playNext() {
  if (queue.length === 0) return;
  if (isShuffle) queueIndex = Math.floor(Math.random() * queue.length);
  else queueIndex = (queueIndex + 1) % queue.length;
  const v = queue[queueIndex];
  playVideo(v.videoId, v.title, v.channel, v.thumb);
}

function playPrev() {
  if (queue.length === 0) return;
  queueIndex = (queueIndex - 1 + queue.length) % queue.length;
  const v = queue[queueIndex];
  playVideo(v.videoId, v.title, v.channel, v.thumb);
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  document.getElementById('shuffleBtn').style.color = isShuffle ? 'var(--accent-soft)' : '';
  showToast(isShuffle ? 'Shuffle ON' : 'Shuffle OFF');
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  document.getElementById('repeatBtn').style.color = isRepeat ? 'var(--accent-soft)' : '';
  showToast(isRepeat ? 'Repeat ON' : 'Repeat OFF');
}

function toggleMute() {
  isMuted = !isMuted;
  if (ytReady) isMuted ? ytPlayer.mute() : ytPlayer.unMute();
  document.getElementById('volIcon').className = isMuted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
}

function setVolume(v) {
  currentVolume = parseInt(v);
  if (ytReady) ytPlayer.setVolume(currentVolume);
}

function seekTo(e) {
  if (!ytReady || !currentVideo) return;
  const bar = document.getElementById('prog-bar');
  const rect = bar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const dur = ytPlayer.getDuration();
  if (dur > 0) ytPlayer.seekTo(pct * dur, true);
}

/* ---- PROGRESS LOOP ---- */
function startProgressLoop() {
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (!ytReady || !ytPlayer.getCurrentTime) return;
    const cur = ytPlayer.getCurrentTime() || 0;
    const dur = ytPlayer.getDuration()    || 0;
    if (dur > 0) {
      const pct = (cur / dur) * 100;
      document.getElementById('prog-fill').style.width = pct + '%';
      document.getElementById('cur-time').textContent = fmtTime(cur);
      document.getElementById('dur-time').textContent = fmtTime(dur);
    }
  }, 500);
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

/* ---- LIKE ---- */
function toggleLike() {
  if (!currentVideo) return showToast('Play a song first!');
  const likeBtn = document.getElementById('likeBtn');
  const btn = likeBtn ? likeBtn.querySelector('i') : null;
  const idx = likedSongs.findIndex(s => s.videoId === currentVideo.videoId);
  if (idx > -1) {
    likedSongs.splice(idx, 1);
    if (btn) btn.style.color = '';
    showToast('Removed from Liked Songs');
  } else {
    likedSongs.push({ ...currentVideo });
    if (btn) btn.style.color = 'var(--pink)';
    showToast('❤️ Added to Liked Songs!');
  }
  renderLikedSongs();
}

function renderLikedSongs() {
  const el = document.getElementById('liked-songs-list');
  if (!el) return;
  if (likedSongs.length === 0) {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">
      <i class="fas fa-heart" style="font-size:36px;color:var(--text-dim);margin-bottom:12px;display:block"></i>
      <p>Songs you like will appear here. Hit ♥ while listening!</p>
    </div>`;
    return;
  }
  el.innerHTML = likedSongs.map((s, i) => {
    const title = escStr(s.title);
    const ch    = escStr(s.channel);
    const thumb = escStr(s.thumb || '');
    return `
    <div class="track-row" onclick="playVideo('${s.videoId}','${title}','${ch}','${thumb}')">
      <span class="track-num">${i+1}</span>
      <span class="track-play"><i class="fas fa-play"></i></span>
      <div class="track-thumb">${s.thumb?`<img src="${s.thumb}" alt="thumb">`:'🎵'}</div>
      <div class="track-info"><h4>${title}</h4><p>${ch}</p></div>
      <span class="track-duration"><i class="fas fa-heart" style="color:var(--pink)"></i></span>
    </div>`;
  }).join('');
}

/* ---- RECENT TRACKS ---- */
let recentTracks = [
  { videoId: 'tVj0ZTS4WF4', title: 'Tum Hi Ho – Arijit Singh', channel: 'T-Series', thumb: '' },
  { videoId: 'ALZHF5UqnU4', title: 'Kesariya – Arijit Singh', channel: 'Dharma Music', thumb: '' },
  { videoId: '3AtDnEC4zak', title: 'Raataan Lambiyan', channel: 'T-Series', thumb: '' },
];

function addToRecent(v) {
  recentTracks = recentTracks.filter(r => r.videoId !== v.videoId);
  recentTracks.unshift(v);
  if (recentTracks.length > 10) recentTracks.pop();
  renderRecent();
}

function renderRecent() {
  const el = document.getElementById('recent-tracks');
  if (!el) return;
  el.innerHTML = recentTracks.slice(0, 6).map((s, i) => {
    const vid   = encodeURIComponent(s.videoId);
    const title = escStr(s.title);
    const ch    = escStr(s.channel);
    const thumb = escStr(s.thumb || '');
    return `
    <div class="track-row" onclick="playVideo('${s.videoId}','${title}','${ch}','${thumb}')">
      <span class="track-num">${i+1}</span>
      <span class="track-play"><i class="fas fa-play"></i></span>
      <div class="track-thumb">${s.thumb?`<img src="${s.thumb}" alt="thumb">`:'🎵'}</div>
      <div class="track-info"><h4>${title}</h4><p>${ch}</p></div>
      <button class="track-heart" onclick="event.stopPropagation();heartTrack(this,'${s.videoId}','${title}','${ch}','${thumb}')">
        <i class="fas fa-heart"></i>
      </button>
      <span class="track-duration">♪</span>
    </div>`;
  }).join('');
}

// Wait for DOM before first render
document.addEventListener('DOMContentLoaded', renderRecent);

function heartTrack(el, videoId, title, channel, thumb) {
  const icon = el.querySelector('i');
  const idx = likedSongs.findIndex(s => s.videoId === videoId);
  if (idx > -1) {
    icon.style.color = '';
    likedSongs.splice(idx, 1);
    showToast('Removed from Liked Songs');
  } else {
    icon.style.color = 'var(--pink)';
    likedSongs.push({ videoId, title, channel, thumb });
    showToast('❤️ Added to Liked Songs!');
  }
  renderLikedSongs();
}

/* ---- SEARCH ---- */
let lastQuery = '';

function handleSearch(val) {
  clearTimeout(searchDebounce);
  if (val.length < 2) return;
  searchDebounce = setTimeout(() => triggerSearch(val), 700);
}

function triggerSearch(q) {
  const input = document.getElementById('searchInput');
  const query = q || input.value.trim();
  if (!query || query === lastQuery) return;
  lastQuery = query;
  fetchYT(query);
}

function searchAndPlay(q) {
  document.getElementById('searchInput').value = q;
  goTo('search', null);
  fetchYT(q, true);
}

function fetchYT(query, autoPlay) {
  const area = document.getElementById('search-results-area');
  area.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Searching for "${query}"…</span></div>`;

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${encodeURIComponent(query)}&key=${API_KEY}&maxResults=12`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (!data.items || data.items.length === 0) {
        area.innerHTML = `<div class="search-empty"><i class="fas fa-search"></i><h3>No results</h3><p>Try a different search term</p></div>`;
        return;
      }
      queue = data.items.map(v => ({
        videoId:  v.id.videoId,
        title:    v.snippet.title,
        channel:  v.snippet.channelTitle,
        thumb:    v.snippet.thumbnails.medium.url
      }));
      queueIndex = 0;
      renderResults(data.items);
      if (autoPlay) playVideo(queue[0].videoId, queue[0].title, queue[0].channel, queue[0].thumb);
    })
    .catch(() => {
      area.innerHTML = `<div class="search-empty"><i class="fas fa-exclamation-triangle" style="color:#ef4444"></i><h3>Search failed</h3><p>Check your API key or connection</p></div>`;
    });
}

function renderResults(items) {
  const area = document.getElementById('search-results-area');
  area.innerHTML = `
    <div style="padding:16px 36px 8px;font-size:13px;color:var(--text-muted)">
      Found ${items.length} results
    </div>
    <div class="search-results-grid">
      ${items.map((v, i) => {
        const vid   = v.id.videoId;
        const title = escStr(v.snippet.title);
        const ch    = escStr(v.snippet.channelTitle);
        const thumb = v.snippet.thumbnails.medium.url;
        return `
          <div class="result-card">
            <img src="${thumb}" alt="${title}" loading="lazy">
            <div class="result-card-body">
              <h4>${title}</h4>
              <p><i class="fab fa-youtube" style="color:#ff0000"></i> ${ch}</p>
            </div>
            <button class="result-card-play"
              onclick="queueIndex=${i};playVideo('${vid}','${title}','${ch}','${thumb}')">
              <i class="fas fa-play"></i> Play
            </button>
          </div>`;
      }).join('')}
    </div>`;
}

/* ---- UTILS ---- */
function escStr(s) {
  // Encode all chars that break HTML attribute values and inline JS strings
  return (s || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ---- KEYBOARD SHORTCUTS ---- */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space')  { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight') playNext();
  if (e.code === 'ArrowLeft')  playPrev();
  if (e.code === 'KeyL')       toggleLike();
});