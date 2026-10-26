(() => {
  'use strict';
  const VIDEO_ID = '_ITiwPMUzho';
  const root = document.querySelector('#radio');
  if (!root) return;
  const panel = document.querySelector('#radio-panel');
  const launcher = document.querySelector('#radio-expand');
  const playButton = document.querySelector('#radio-play');
  const muteButton = document.querySelector('#radio-mute');
  const volumeInput = document.querySelector('#radio-volume');
  const volumeOutput = document.querySelector('#radio-volume-value');
  const status = document.querySelector('#radio-status');
  const miniStatus = document.querySelector('#radio-mini-status');
  const message = document.querySelector('#radio-message');
  const elapsed = document.querySelector('#radio-elapsed');
  const duration = document.querySelector('#radio-duration');
  const progress = document.querySelector('#radio-progress');
  const mediaHost = document.querySelector('#radio-media');
  let player = null;
  let playerReady = false;
  let wantsPlayback = false;
  let state = 'idle';
  let volume = 25;
  let previousVolume = 25;
  let tick = null;
  let readyTimeout = null;
  let bufferTimeout = null;
  let apiPromise = null;
  let generation = 0;
  try {
    const stored = localStorage.getItem('thiago-radio-volume');
    if (stored !== null && Number.isFinite(Number(stored))) volume = Math.max(0, Math.min(100, Number(stored)));
    if (volume > 0) previousVolume = volume;
  } catch { /* The radio also works without local storage. */ }
  function setCollapsed(collapsed, focus = false) {
    panel.hidden = collapsed;
    launcher.hidden = !collapsed;
    launcher.setAttribute('aria-expanded', String(!collapsed));
    if (focus) (collapsed ? launcher : playButton).focus({ preventScroll: true });
  }
  launcher.addEventListener('click', () => setCollapsed(false, true));
  document.querySelector('#radio-minimize').addEventListener('click', () => setCollapsed(true, true));
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); setCollapsed(true, true); } });
  setCollapsed(window.matchMedia('(max-width:620px)').matches);
  function setState(nextState, text) {
    state = nextState;
    clearTimeout(bufferTimeout);
    if (state === 'buffering') bufferTimeout = setTimeout(() => { if (state === 'buffering' && wantsPlayback) showFailure('O YouTube demorou para carregar. Tente novamente ou use o link para ouvir.'); }, 25000);
    const playing = state === 'playing';
    const busy = state === 'loading' || state === 'buffering';
    root.classList.toggle('is-playing', playing);
    root.classList.toggle('is-busy', busy);
    playButton.setAttribute('aria-pressed', String(playing));
    playButton.setAttribute('aria-label', busy ? 'Cancelar reprodução' : playing ? 'Pausar música' : state === 'error' ? 'Tentar reproduzir novamente' : 'Reproduzir música');
    status.textContent = text || ({idle:'Aperte o play para ouvir',loading:'Conectando ao YouTube…',buffering:'Carregando música…',playing:'Tocando agora',paused:'Pausado',ended:'Fim do mix · ouvir novamente',blocked:'Toque em play para começar',error:'Não foi possível tocar aqui'}[state] || 'Pronto para ouvir');
    miniStatus.textContent = playing ? 'tocando agora' : busy ? 'conectando…' : state === 'error' ? 'abrir rádio' : 'lo-fi para ouvir';
    launcher.setAttribute('aria-label', playing ? 'Abrir rádio, música tocando' : 'Abrir rádio');
    if (playing) startTimer(); else stopTimer();
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = playing ? 'playing' : playerReady ? 'paused' : 'none'; } catch { /* Optional browser integration. */ }
    }
  }
  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    return hours ? hours + ':' + String(minutes).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0') : minutes + ':' + String(seconds % 60).padStart(2,'0');
  }
  function updateTime() {
    if (!playerReady || !player) return;
    try {
      const current = player.getCurrentTime() || 0;
      const total = player.getDuration() || 0;
      const percentage = total > 0 ? Math.min(100,current / total * 100) : 0;
      elapsed.textContent = formatTime(current);
      duration.textContent = total > 0 ? formatTime(total) : '—:—';
      progress.firstElementChild.style.width = percentage + '%';
      progress.setAttribute('aria-valuenow', String(Math.round(percentage)));
    } catch { /* Wait for the next player state. */ }
  }
  function startTimer() { stopTimer(); updateTime(); tick = window.setInterval(updateTime, 1000); }
  function stopTimer() { if (tick !== null) { clearInterval(tick); tick = null; } }
  function syncVolume(save = true) {
    volumeInput.value = String(volume);
    volumeInput.style.setProperty('--range-value', volume + '%');
    volumeInput.setAttribute('aria-valuetext', volume + '%');
    volumeOutput.value = volume + '%';
    root.classList.toggle('is-muted', volume === 0);
    muteButton.setAttribute('aria-pressed', String(volume === 0));
    muteButton.setAttribute('aria-label', volume === 0 ? 'Ativar som' : 'Silenciar música');
    if (playerReady && player) {
      try { player.setVolume(volume); if (volume === 0) player.mute(); else player.unMute(); } catch { /* Apply when ready. */ }
    }
    if (save) { try { localStorage.setItem('thiago-radio-volume', String(volume)); } catch { /* Optional preference. */ } }
  }
  volumeInput.addEventListener('input', () => { if (volume > 0) previousVolume = volume; volume = Number(volumeInput.value); if (volume > 0) previousVolume = volume; syncVolume(); });
  muteButton.addEventListener('click', () => { if (volume > 0) { previousVolume = volume; volume = 0; } else volume = previousVolume || 25; syncVolume(); });
  syncVolume(false);
  function showFailure(text) {
    wantsPlayback = false;
    clearTimeout(readyTimeout);
    message.hidden = false;
    message.textContent = text || 'O YouTube não respondeu. Você pode tentar de novo ou abrir a música pelo link.';
    setState('error');
  }
  function loadAPI() {
    if (window.YT?.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      let settled = false;
      const existingCallback = window.onYouTubeIframeAPIReady;
      const timeout = setTimeout(() => { if (!settled) { settled = true; apiPromise = null; script.remove(); reject(new Error('timeout')); } }, 15000);
      const ready = () => {
        if (settled) return;
        settled = true; clearTimeout(timeout); resolve();
      };
      window.onYouTubeIframeAPIReady = () => { if (typeof existingCallback === 'function') { try { existingCallback(); } catch { /* Preserve other integrations. */ } } ready(); };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => { if (!settled) { settled = true; clearTimeout(timeout); apiPromise = null; script.remove(); reject(new Error('network')); } };
      document.head.append(script);
    });
    return apiPromise;
  }
  async function initialize() {
    const thisGeneration = ++generation;
    playerReady = false;
    message.hidden = true;
    setState('loading');
    try {
      await loadAPI();
      if (thisGeneration !== generation) return;
      if (player) { try { player.destroy(); } catch { /* Replace a failed player. */ } }
      const mount = document.createElement('div'); mount.id = 'radio-youtube'; mediaHost.replaceChildren(mount);
      readyTimeout = setTimeout(() => { if (thisGeneration === generation && !playerReady) showFailure(); }, 20000);
      player = new window.YT.Player('radio-youtube', {
        width:200, height:200, videoId:VIDEO_ID,
        playerVars:{autoplay:0,controls:0,playsinline:1,rel:0,fs:0,origin:window.location.origin},
        events:{
          onReady(event) {
            if (thisGeneration !== generation) return;
            clearTimeout(readyTimeout); playerReady = true;
            const frame = event.target.getIframe();
            frame.tabIndex = -1; frame.title = 'Reprodutor de música do YouTube'; frame.setAttribute('allow','autoplay; encrypted-media');
            frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
            syncVolume(false); updateTime();
            if (wantsPlayback) event.target.playVideo(); else setState('paused');
          },
          onStateChange(event) {
            if (thisGeneration !== generation || !playerReady) return;
            const value = event.data;
            if (value === 1) {
              if (!wantsPlayback) { event.target.pauseVideo(); return; }
              message.hidden = true; setState('playing');
            } else if (value === 2) { wantsPlayback = false; setState('paused'); updateTime(); }
            else if (value === 3) { if (wantsPlayback) setState('buffering'); }
            else if (value === 0) { wantsPlayback = false; setState('ended'); updateTime(); }
            else if (value === 5 && !wantsPlayback) setState('paused');
          },
          onError(event) {
            if (thisGeneration !== generation) return;
            showFailure(event.data === 101 || event.data === 150 ? 'A reprodução deste mix não está disponível aqui. Use o link do YouTube para ouvir.' : 'Não consegui iniciar o mix. Tente novamente ou abra no YouTube.');
          },
          onAutoplayBlocked() { if (thisGeneration !== generation) return; wantsPlayback = false; setState('blocked'); }
        }
      });
    } catch { if (thisGeneration === generation) showFailure(); }
  }
  function pause() {
    wantsPlayback = false;
    if (playerReady && player) { try { player.pauseVideo(); } catch { /* UI remains paused. */ } }
    setState('paused');
  }
  function play() {
    wantsPlayback = true; message.hidden = true;
    if (playerReady && player && state !== 'error') {
      try { if (player.getPlayerState() === 0) player.seekTo(0,true); syncVolume(false); player.playVideo(); setState('buffering'); }
      catch { initialize(); }
    } else initialize();
  }
  playButton.addEventListener('click', () => { if (wantsPlayback || state === 'playing') pause(); else play(); });
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play',play);
      navigator.mediaSession.setActionHandler('pause',pause);
      if ('MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({title:'3 AM Coding Session',artist:'Lofi · Study & coding beats',album:'Radinho do Thiago'});
    } catch { /* Media keys are optional. */ }
  }
})();
