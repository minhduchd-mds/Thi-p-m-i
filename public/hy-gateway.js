
/* Hỷ Studio interactive gateway. Plain JS, no third-party code or 3D runtime dependency. */
(() => {
  'use strict';
  const gateway = document.getElementById('hy-gateway');
  const app = document.getElementById('app');
  if (!gateway || !app) return;
  const params = new URLSearchParams(window.location.search);
  // A shared card or edit link must open immediately, without an intro or additional UI.
  if (params.has('card') || params.has('edit') || window.location.hash) return;

  const $ = sel => gateway.querySelector(sel);
  const hall = $('#hy-page-hall');
  const library = $('#hy-page-library');
  const manager = $('#hy-page-manager');
  const entrance = $('#hy-enter');
  const skip = $('#hy-skip');
  const back = gateway.querySelectorAll('[data-hy-back]');

  // A genuine, bundled instrumental track. Start only inside a user interaction,
  // because iOS/Safari/Chrome may block audible autoplay on initial page load.
  const welcomeAudio = document.createElement('audio');
  welcomeAudio.id = 'hy-gateway-music';
  welcomeAudio.src = '/assets/music/duyen-ngoc-phuong-dong.mp3';
  welcomeAudio.preload = 'auto';
  welcomeAudio.loop = true;
  welcomeAudio.volume = 0.32;
  gateway.appendChild(welcomeAudio);

  const soundToggle = document.createElement('button');
  soundToggle.type = 'button';
  soundToggle.id = 'hy-sound-toggle';
  soundToggle.className = 'hy-sound';
  gateway.appendChild(soundToggle);

  let soundFadeTimer = null;
  let userMutedWelcome = false;

  const syncSoundButton = () => {
    const playing = !welcomeAudio.paused;
    soundToggle.textContent = playing ? '♫ Tắt nhạc' : '♫ Bật nhạc';
    soundToggle.setAttribute('aria-label', playing ? 'Tắt nhạc sảnh Hỷ Studio' : 'Bật nhạc sảnh Hỷ Studio');
    soundToggle.setAttribute('aria-pressed', String(playing));
  };

  const startWelcomeMusic = () => {
    if (soundFadeTimer) window.clearInterval(soundFadeTimer);
    soundFadeTimer = null;
    welcomeAudio.volume = 0.32;
    try {
      // Crucial: play() is called synchronously from a click/keyboard action.
      const result = welcomeAudio.play();
      syncSoundButton();
      if (result && typeof result.then === 'function') {
        result.then(syncSoundButton).catch(() => {
          syncSoundButton();
          soundToggle.title = 'Trình duyệt chưa cho phép phát nhạc; nhấn Bật nhạc để thử lại.';
        });
      }
    } catch (_) {
      syncSoundButton();
      soundToggle.title = 'Không thể phát nhạc; kiểm tra âm lượng và tệp nhạc.';
    }
  };

  const stopWelcomeMusic = (fade = true) => {
    if (soundFadeTimer) window.clearInterval(soundFadeTimer);
    soundFadeTimer = null;
    if (!fade || welcomeAudio.paused) {
      welcomeAudio.pause();
      welcomeAudio.currentTime = 0;
      welcomeAudio.volume = 0.32;
      syncSoundButton();
      return;
    }
    const startingVolume = welcomeAudio.volume;
    let frame = 0;
    soundToggle.textContent = '♫ Bật nhạc';
    soundToggle.setAttribute('aria-label', 'Bật nhạc sảnh Hỷ Studio');
    soundToggle.setAttribute('aria-pressed', 'false');
    soundFadeTimer = window.setInterval(() => {
      frame += 1;
      welcomeAudio.volume = Math.max(0, startingVolume * (1 - frame / 8));
      if (frame >= 8) {
        window.clearInterval(soundFadeTimer);
        soundFadeTimer = null;
        welcomeAudio.pause();
        welcomeAudio.currentTime = 0;
        welcomeAudio.volume = 0.32;
        syncSoundButton();
      }
    }, 65);
  };

  soundToggle.addEventListener('click', () => {
    if (welcomeAudio.paused) {
      userMutedWelcome = false;
      startWelcomeMusic();
    } else {
      userMutedWelcome = true;
      stopWelcomeMusic(false);
    }
  });
  welcomeAudio.addEventListener('ended', syncSoundButton);
  welcomeAudio.addEventListener('pause', syncSoundButton);
  welcomeAudio.addEventListener('play', syncSoundButton);
  welcomeAudio.addEventListener('error', () => {
    syncSoundButton();
    soundToggle.title = 'Tệp nhạc chào mừng không tải được. Vui lòng kiểm tra kết nối.';
  });
  syncSoundButton();

  let openingTimer = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setPage = page => {
    for (const el of [hall, library, manager]) el.hidden = el !== page;
    const focusTarget = page.querySelector('button:not([disabled])');
    if (focusTarget) focusTarget.focus({preventScroll:true});
  };
  const setShown = shown => {
    gateway.hidden = !shown;
    gateway.setAttribute('aria-hidden', String(!shown));
    document.body.classList.toggle('hy-intro-active', shown);
    app.inert = shown;
  };
  const finishOpening = () => {
    if (openingTimer) clearTimeout(openingTimer);
    openingTimer = null;
    gateway.dataset.state = 'hall';
    skip.textContent = 'Vào trình thiết kế ↗';
    setPage(hall);
    try { sessionStorage.setItem('hy-studio-gateway-seen', '1'); } catch (_) {}
  };
  const openDoors = () => {
    if (gateway.dataset.state !== 'closed') return;
    if (!userMutedWelcome) startWelcomeMusic();
    if (reduceMotion) { finishOpening(); return; }
    gateway.dataset.state = 'opening';
    entrance.disabled = true;
    openingTimer = window.setTimeout(finishOpening, 1550);
  };
  const gotoEditor = section => {
    if (openingTimer) clearTimeout(openingTimer);
    openingTimer = null;
    stopWelcomeMusic();
    setShown(false);
    if (section === 'music') {
      document.querySelector('[data-tab="music"]')?.click();
      document.getElementById('panel-music')?.scrollIntoView({behavior:'auto',block:'start'});
    } else {
      const anchor = section === 'templates' ? 'mau-thiep' : 'chinh-sua';
      document.getElementById(anchor)?.scrollIntoView({behavior:'auto',block:'start'});
    }
    document.getElementById('chinh-sua')?.setAttribute('tabindex', '-1');
    document.getElementById('chinh-sua')?.focus({preventScroll:true});
  };
  const lobby = () => {
    entrance.disabled = false;
    gateway.dataset.state = 'hall';
    skip.textContent = 'Vào trình thiết kế ↗';
    document.getElementById('bg-music')?.pause();
    setShown(true);
    setPage(hall);
    if (!userMutedWelcome) startWelcomeMusic();
  };

  const ownedList = $('#hy-owned-list');
  const note = $('#hy-owned-note');
  async function showManager() {
    setPage(manager);
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        const match = /^hy-studio-owner-([a-f0-9-]{36})$/.exec(key || '');
        if (match && localStorage.getItem(key)) keys.push(match[1]);
      }
    } catch (_) {
      note.textContent = 'Trình duyệt đang chặn bộ nhớ cục bộ, không thể tìm thiệp đã tạo.';
      ownedList.replaceChildren();
      return;
    }
    ownedList.replaceChildren();
    if (!keys.length) {
      note.textContent = 'Chưa có thiệp lưu trên trình duyệt này. Đây chưa phải danh sách đồng bộ qua tài khoản.';
      const empty = document.createElement('div');
      empty.className = 'hy-empty';
      empty.textContent = 'Sau khi anh tạo và lưu thiệp, liên kết chỉnh sửa sẽ được ghi nhớ trên chính trình duyệt này. Dữ liệu trên thiết bị khác sẽ không tự đồng bộ.';
      ownedList.appendChild(empty);
      return;
    }
    note.textContent = 'Đang kiểm tra thiệp trên máy chủ…';
    for (const id of keys.slice(0, 15)) {
      const row = document.createElement('div');
      row.className = 'hy-owned-card';
      const summary = document.createElement('div');
      const name = document.createElement('strong');
      const status = document.createElement('small');
      name.textContent = 'Thiệp đang tải…';
      summary.append(name, status);
      row.append(summary);
      ownedList.appendChild(row);
      try {
        const response = await fetch('/api/cards/' + encodeURIComponent(id), {cache:'no-store'});
        if (!response.ok) {
          name.textContent = 'Thiệp không còn khả dụng';
          status.textContent = response.status === 410 ? 'Đã hết hạn 30 ngày' : 'Không tìm thấy hoặc chưa kết nối máy chủ';
          continue;
        }
        const record = await response.json();
        const d = record.data || {};
        name.textContent = [d.bride, d.groom].filter(Boolean).join(' & ') || 'Thiệp chưa đặt tên';
        status.textContent = record.expiresAt ? 'Hết hạn: ' + new Date(record.expiresAt).toLocaleDateString('vi-VN') : 'Thiệp đã lưu';
        const edit = document.createElement('a');
        edit.href = '/?edit=' + encodeURIComponent(id);
        edit.textContent = 'Chỉnh sửa ↗';
        edit.setAttribute('aria-label', 'Chỉnh sửa thiệp ' + name.textContent);
        row.appendChild(edit);
      } catch (_) {
        name.textContent = 'Không thể tải thông tin thiệp';
        status.textContent = 'Vui lòng kiểm tra máy chủ hoặc đường truyền.';
      }
    }
    note.textContent = keys.length > 15 ? 'Đang hiển thị 15 thiệp đầu tiên trên thiết bị này.' : 'Danh sách chỉ gồm thiệp có quyền chỉnh sửa trên trình duyệt hiện tại.';
  }

  entrance.addEventListener('click', openDoors);
  skip.addEventListener('click', () => {
    if (gateway.dataset.state === 'hall') gotoEditor('design');
    else {
      if (!userMutedWelcome) startWelcomeMusic();
      finishOpening();
    }
  });
  back.forEach(btn => btn.addEventListener('click', () => setPage(hall)));
  gateway.querySelectorAll('[data-hy-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      switch (btn.dataset.hyAction) {
        case 'templates': setPage(library); break;
        case 'design': gotoEditor('design'); break;
        case 'music': gotoEditor('music'); break;
        case 'manage': showManager(); break;
      }
    });
  });
  gateway.querySelectorAll('[data-hy-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('[data-theme="' + btn.dataset.hyTheme + '"]')?.click();
      gotoEditor('templates');
    });
  });
  document.addEventListener('keydown', event => {
    if (gateway.hidden || event.key !== 'Escape') return;
    event.preventDefault();
    if (!hall.hidden) gotoEditor('design');
    else setPage(hall);
  });
  // The original editor, API save logic, RSVP and guest preview remain untouched.
  const homeButton = document.createElement('button');
  homeButton.type = 'button';
  homeButton.className = 'hy-lobby-return editor-only';
  homeButton.textContent = '⌂ Sảnh Hỷ Studio';
  homeButton.setAttribute('aria-label', 'Quay về sảnh Hỷ Studio');
  homeButton.addEventListener('click', lobby);
  document.querySelector('.topbar .top-spacer')?.after(homeButton);

  gateway.dataset.state = 'closed';
  setShown(true);
  setPage(hall);
  try {
    if (sessionStorage.getItem('hy-studio-gateway-seen') === '1') finishOpening();
    else entrance.focus({preventScroll:true});
  } catch (_) { entrance.focus({preventScroll:true}); }
})();
