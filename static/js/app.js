document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-pause-hero');
    const prevBtn = document.getElementById('prev-track-btn');
    const nextBtn = document.getElementById('next-track-btn');
    const shuffleBtn = document.getElementById('toggle-shuffle');
    const loopBtn = document.getElementById('toggle-loop');

    const trackSeeker = document.getElementById('track-seeker');
    const currTimeEl = document.getElementById('curr-time');
    const totalTimeEl = document.getElementById('total-time');
    const trackNameEl = document.getElementById('current-track-name');
    const volumeSlider = document.getElementById('volume-slider');
    const volTrigger = document.getElementById('vol-trigger');
    const volBox = document.getElementById('vol-box');

    // Элементы скорости
    const speedTrigger = document.getElementById('speed-trigger');
    const speedBox = document.getElementById('speed-box');
    const speedSlider = document.getElementById('speed-slider');
    const speedValDisplay = document.getElementById('speed-val-display');
    const speedChips = document.querySelectorAll('.btn-speed-chip');

    // Элементы меток (закладок)
    const btnOpenBookmarks = document.getElementById('btn-open-bookmarks');
    const bookmarksModal = document.getElementById('bookmarks-modal');
    const btnCloseBookmarks = document.getElementById('btn-close-bookmarks');
    const bmCaptureTime = document.getElementById('bm-capture-time');
    const bmInputTitle = document.getElementById('bm-input-title');
    const btnSaveBookmark = document.getElementById('btn-save-bookmark');
    const bookmarksListEl = document.getElementById('bookmarks-list');
    const timelineTicksEl = document.getElementById('timeline-ticks');

    // Плейлист и шторка
    const playlistSheet = document.getElementById('playlist-sheet');
    const openPlBtn = document.getElementById('open-playlist-btn');
    const closeSheetBtn = document.getElementById('close-sheet');
    const closeHandle = document.getElementById('close-handle');
    const folderDropdown = document.getElementById('folder-dropdown');
    const btnCreateFolder = document.getElementById('btn-create-folder');
    const btnRefreshPl = document.getElementById('btn-refresh-pl');
    const playlistEl = document.getElementById('real-playlist');
    const shelfInfo = document.getElementById('shelf-playlist-info');
    const searchInput = document.getElementById('playlist-search');

    // Загрузчик
    const dlModeYt = document.getElementById('dl-mode-yt');
    const dlModeStream = document.getElementById('dl-mode-stream');
    const dlUrlInput = document.getElementById('dl-url-input');
    const dlCustomName = document.getElementById('dl-custom-name');
    const startDlBtn = document.getElementById('start-download-btn');
    const listenDirectBtn = document.getElementById('listen-direct-btn');
    const dlProgressBox = document.getElementById('dl-progress-container');
    const dlBarFill = document.getElementById('dl-bar-fill');
    const dlStatusLabel = document.getElementById('dl-status-label');
    const dlStatusNum = document.getElementById('dl-status-num');
    const srvBtn = document.getElementById('services-btn');
    const srvMenu = document.getElementById('services-menu');

    // Контекстное меню
    const ctxMenu = document.getElementById('track-context-menu');
    const ctxMoveBtn = document.getElementById('ctx-move-btn');
    const ctxDeleteBtn = document.getElementById('ctx-delete-btn');
    let activeMenuTrack = null;

    // A-B Loop
    const btnLoopA = document.getElementById('btn-loop-a');
    const btnLoopB = document.getElementById('btn-loop-b');
    const btnLoopClear = document.getElementById('btn-loop-clear');
    const abStatus = document.getElementById('ab-status');
    let loopA = null;
    let loopB = null;

    // Состояние плеера
    let tracks = [];
    let folders = [];
    let currentFolder = localStorage.getItem('currentFolder') || '';
    let currentTrack = null;
    let currentDlMode = 'youtube';
    let isLooping = JSON.parse(localStorage.getItem('isLooping')) || false;
    let isShuffle = JSON.parse(localStorage.getItem('isShuffle')) || false;
    let customOrderMap = JSON.parse(localStorage.getItem('customOrderMap')) || {};
    let dlPollTimer = null;

    // Состояние меток и скорости
    let currentBookmarks = [];
    let capturedMarkTime = 0;
    let wasPlayingBeforeModal = false;
    let currentSpeed = parseFloat(localStorage.getItem('playerSpeed') || '1.0');

    /* ================= 1. ТЕМА ================= */
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (localStorage.getItem('playerTheme') === 'light') {
        document.body.classList.add('light-theme');
        themeBtn.textContent = '🌙';
    }
    themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        themeBtn.textContent = isLight ? '🌙' : '☀️';
        localStorage.setItem('playerTheme', isLight ? 'light' : 'dark');
    });

    /* ================= 2. ВКЛАДКИ ================= */
    const tabPlayerBtn = document.getElementById('tab-player-btn');
    const tabDlBtn = document.getElementById('tab-dl-btn');
    const panePlayer = document.getElementById('pane-player');
    const paneDl = document.getElementById('pane-downloader');

    tabPlayerBtn.addEventListener('click', () => {
        tabPlayerBtn.classList.add('active');
        tabDlBtn.classList.remove('active');
        panePlayer.classList.remove('hidden');
        paneDl.classList.add('hidden');
    });
    tabDlBtn.addEventListener('click', () => {
        tabDlBtn.classList.add('active');
        tabPlayerBtn.classList.remove('active');
        paneDl.classList.remove('hidden');
        panePlayer.classList.add('hidden');
    });

    /* ================= 3. РЕЖИМ ПЕРЕМЕЩЕНИЯ МОДУЛЕЙ ================= */
    const editBtn = document.getElementById('edit-layout-btn');
    const resetBtn = document.getElementById('reset-layout-btn');
    const modularSpace = document.getElementById('modular-space');
    let isEditMode = false;
    const movableIds = ['mod-timeline', 'mod-loop', 'mod-controls'];
    let savedOffsets = JSON.parse(localStorage.getItem('modularLayoutOffsets') || '{}');

    function applyOffsets() {
        movableIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const val = savedOffsets[id] || 0;
                el.style.transform = `translateY(${val}px)`;
            }
        });
    }
    applyOffsets();

    editBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        document.body.classList.toggle('edit-mode', isEditMode);
        editBtn.classList.toggle('active-edit', isEditMode);
        editBtn.textContent = isEditMode ? '✓' : '🛠️';
        resetBtn.classList.toggle('hidden', !isEditMode);

        if (!isEditMode) {
            localStorage.setItem('modularLayoutOffsets', JSON.stringify(savedOffsets));
        }
    });

    resetBtn.addEventListener('click', () => {
        savedOffsets = {};
        localStorage.removeItem('modularLayoutOffsets');
        applyOffsets();
    });

    movableIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        let startY = 0;
        let initialTranslateY = 0;

        const onTouchStart = (e) => {
            if (!isEditMode) return;
            const touch = e.touches ? e.touches[0] : e;
            startY = touch.clientY;
            initialTranslateY = savedOffsets[id] || 0;
            el.style.zIndex = 30;
        };

        const onTouchMove = (e) => {
            if (!isEditMode) return;
            const touch = e.touches ? e.touches[0] : e;
            const deltaY = touch.clientY - startY;
            let targetY = initialTranslateY + deltaY;

            const spaceRect = modularSpace.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const minAllowedY = initialTranslateY - (elRect.top - spaceRect.top);
            const maxAllowedY = initialTranslateY + (spaceRect.bottom - elRect.bottom);

            if (targetY < minAllowedY) targetY = minAllowedY;
            if (targetY > maxAllowedY) targetY = maxAllowedY;

            el.style.transform = `translateY(${targetY}px)`;
            savedOffsets[id] = targetY;
        };

        const onTouchEnd = () => {
            if (!isEditMode) return;
            el.style.zIndex = '';
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: true });
        el.addEventListener('touchend', onTouchEnd);

        el.addEventListener('mousedown', (e) => {
            onTouchStart(e);
            const onMouseMove = (ev) => onTouchMove(ev);
            const onMouseUp = () => {
                onTouchEnd();
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    });

    /* ================= 4. ГРОМКОСТЬ И РЕЖИМЫ ПОВТОРА ================= */
    audio.loop = false;
    audio.volume = parseFloat(localStorage.getItem('winampVolume') || '0.8');
    volumeSlider.value = audio.volume;

    loopBtn.classList.toggle('active', isLooping);
    shuffleBtn.classList.toggle('active', isShuffle);

    loopBtn.addEventListener('click', () => {
        isLooping = !isLooping;
        loopBtn.classList.toggle('active', isLooping);
        localStorage.setItem('isLooping', isLooping);
    });

    shuffleBtn.addEventListener('click', () => {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
        localStorage.setItem('isShuffle', isShuffle);
    });

    volTrigger.addEventListener('click', (e) => {
        if (isEditMode) return;
        e.stopPropagation();
        volBox.classList.toggle('hidden');
        speedBox.classList.add('hidden');
    });

    // Защита от закрытия поповера громкости при движении пальцем
    volBox.addEventListener('click', (e) => e.stopPropagation());
    volBox.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    volBox.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });

    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value;
        localStorage.setItem('winampVolume', e.target.value);
    });

    // Закрытие всех поповеров при тапе вне их области
    document.addEventListener('click', () => {
        volBox.classList.add('hidden');
        speedBox.classList.add('hidden');
    });

    /* ================= 5. СКОРОСТЬ ВОСПРОИЗВЕДЕНИЯ ================= */
    function applyPlaybackSpeed(val) {
        currentSpeed = parseFloat(val);
        audio.preservesPitch = true; // Убираем искажение тональности (эффект бурундука)
        audio.playbackRate = currentSpeed;

        speedTrigger.textContent = `${currentSpeed.toFixed(2).replace(/\.00$/, '.0')}x`;
        speedValDisplay.textContent = `${currentSpeed.toFixed(2)}x`;
        speedSlider.value = currentSpeed;
        localStorage.setItem('playerSpeed', currentSpeed);

        speedChips.forEach(chip => {
            const s = parseFloat(chip.dataset.speed);
            chip.classList.toggle('active', Math.abs(s - currentSpeed) < 0.02);
        });
    }

    applyPlaybackSpeed(currentSpeed);

    audio.addEventListener('play', () => {
        audio.preservesPitch = true;
        audio.playbackRate = currentSpeed;
    });

    speedTrigger.addEventListener('click', (e) => {
        if (isEditMode) return;
        e.stopPropagation();
        speedBox.classList.toggle('hidden');
        volBox.classList.add('hidden');
    });

    speedBox.addEventListener('click', (e) => e.stopPropagation());
    speedBox.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    speedBox.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });

    speedSlider.addEventListener('input', (e) => {
        applyPlaybackSpeed(e.target.value);
    });

    speedChips.forEach(chip => {
        chip.addEventListener('click', () => {
            applyPlaybackSpeed(chip.dataset.speed);
        });
    });

    /* ================= 6. ВОСПРОИЗВЕДЕНИЕ ================= */
    function formatTime(sec) {
        if (isNaN(sec) || sec < 0) return "00:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function playTrack(track) {
        currentTrack = track;
        trackNameEl.textContent = track.name;
        audio.src = `/stream/${encodeURIComponent(track.path)}`;
        audio.preservesPitch = true;
        audio.playbackRate = currentSpeed;

        audio.play()
            .then(() => {
                playBtn.textContent = '❚❚';
            })
            .catch(e => console.log(e));

        document.querySelectorAll('.pl-row-item').forEach(li => {
            li.classList.toggle('active', li.dataset.path === track.path);
        });

        // Загрузка меток для выбранного трека
        loadBookmarksForTrack(track.path);
    }

    playBtn.addEventListener('click', () => {
        if (isEditMode) return;
        if (!audio.src && tracks.length > 0) {
            playTrack(tracks[0]);
        } else if (audio.paused) {
            audio.play();
            playBtn.textContent = '❚❚';
        } else {
            audio.pause();
            playBtn.textContent = '▶';
        }
    });

    function playNextTrack() {
        if (tracks.length === 0) return;
        if (isLooping && currentTrack) {
            audio.currentTime = 0;
            audio.play();
            return;
        }
        if (isShuffle) {
            const randIdx = Math.floor(Math.random() * tracks.length);
            playTrack(tracks[randIdx]);
            return;
        }
        let currIdx = tracks.findIndex(t => currentTrack && t.path === currentTrack.path);
        let nextIdx = (currIdx + 1) % tracks.length;
        playTrack(tracks[nextIdx]);
    }

    function playPrevTrack() {
        if (tracks.length === 0) return;
        let currIdx = tracks.findIndex(t => currentTrack && t.path === currentTrack.path);
        let prevIdx = (currIdx - 1 + tracks.length) % tracks.length;
        playTrack(tracks[prevIdx]);
    }

    nextBtn.addEventListener('click', () => { if (!isEditMode) playNextTrack(); });
    prevBtn.addEventListener('click', () => { if (!isEditMode) playPrevTrack(); });
    audio.addEventListener('ended', playNextTrack);

    // Синхронизация времени таймлайна
    audio.addEventListener('loadedmetadata', () => {
        trackSeeker.max = audio.duration;
        totalTimeEl.textContent = formatTime(audio.duration);
        renderTimelineTicks();
    });

    audio.addEventListener('durationchange', renderTimelineTicks);

    audio.addEventListener('timeupdate', () => {
        if (!trackSeeker.closest(':active')) {
            trackSeeker.value = audio.currentTime;
        }
        currTimeEl.textContent = formatTime(audio.currentTime);

        // Обработка петли A-B
        if (loopA !== null && loopB !== null && audio.currentTime >= loopB) {
            audio.currentTime = loopA;
        }
    });

    trackSeeker.addEventListener('input', (e) => {
        audio.currentTime = e.target.value;
    });

    // Быстрые кнопки перемотки
    document.querySelectorAll('.btn-seek-step').forEach(btn => {
        btn.addEventListener('click', () => {
            if (isEditMode) return;
            const delta = parseFloat(btn.dataset.seek);
            if (!isNaN(delta)) {
                let target = audio.currentTime + delta;
                if (target < 0) target = 0;
                if (audio.duration && target > audio.duration) target = audio.duration;
                audio.currentTime = target;
            }
        });
    });

    /* ================= 7. МЕТКИ ТРЕКА (BOOKMARKS) ================= */
    function loadBookmarksForTrack(trackPath) {
        if (!trackPath) {
            currentBookmarks = [];
            renderTimelineTicks();
            return;
        }
        fetch(`/api/bookmarks?file=${encodeURIComponent(trackPath)}`)
            .then(res => res.json())
            .then(data => {
                currentBookmarks = Array.isArray(data) ? data : [];
                renderTimelineTicks();
            })
            .catch(() => {
                currentBookmarks = [];
                renderTimelineTicks();
            });
    }

    // Открытие окна с автопаузой и фиксацией секунды
    btnOpenBookmarks.addEventListener('click', () => {
        if (isEditMode) return;
        if (!currentTrack) {
            alert('Сначала выберите или запустите трек!');
            return;
        }

        capturedMarkTime = audio.currentTime;
        bmCaptureTime.textContent = `Время: ${formatTime(capturedMarkTime)}`;
        bmInputTitle.value = '';

        if (!audio.paused) {
            wasPlayingBeforeModal = true;
            audio.pause();
            playBtn.textContent = '▶';
        } else {
            wasPlayingBeforeModal = false;
        }

        bookmarksModal.classList.remove('hidden');
        renderBookmarksList();
        setTimeout(() => bmInputTitle.focus(), 150);
    });

    function closeBookmarksModal() {
        bookmarksModal.classList.add('hidden');
        if (wasPlayingBeforeModal) {
            audio.play();
            playBtn.textContent = '❚❚';
        }
    }

    btnCloseBookmarks.addEventListener('click', closeBookmarksModal);
    bookmarksModal.addEventListener('click', (e) => {
        if (e.target === bookmarksModal) closeBookmarksModal();
    });

    // Сохранение новой метки на сервер
    btnSaveBookmark.addEventListener('click', () => {
        if (!currentTrack) return;
        const label = bmInputTitle.value.trim() || 'Метка';

        fetch('/api/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: currentTrack.path,
                time: capturedMarkTime,
                label: label
            })
        })
        .then(res => res.json())
        .then(data => {
            currentBookmarks = data.bookmarks || [];
            renderTimelineTicks();
            renderBookmarksList();
            bmInputTitle.value = '';
        })
        .catch(err => alert('Ошибка сохранения метки: ' + err));
    });

    // Отрисовка списка меток в модальном окне
    function renderBookmarksList() {
        bookmarksListEl.innerHTML = '';
        if (currentBookmarks.length === 0) {
            bookmarksListEl.innerHTML = '<div class="bm-empty-text">Нет меток для этого трека</div>';
            return;
        }

        currentBookmarks.forEach(bm => {
            const row = document.createElement('div');
            row.className = 'bm-item-row';
            row.innerHTML = `
                <span class="bm-item-time">${formatTime(bm.time)}</span>
                <span class="bm-item-title" title="${bm.label}">${bm.label}</span>
                <button class="bm-item-del-btn" title="Удалить метку">✕</button>
            `;

            // Тап по времени или тексту — переход к точке
            const jumpToMark = () => {
                audio.currentTime = bm.time;
                closeBookmarksModal();
            };
            row.querySelector('.bm-item-time').addEventListener('click', jumpToMark);
            row.querySelector('.bm-item-title').addEventListener('click', jumpToMark);

            // Удаление метки с сервера
            row.querySelector('.bm-item-del-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                fetch('/api/bookmarks', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file: currentTrack.path,
                        id: bm.id
                    })
                })
                .then(res => res.json())
                .then(data => {
                    currentBookmarks = data.bookmarks || [];
                    renderTimelineTicks();
                    renderBookmarksList();
                });
            });

            bookmarksListEl.appendChild(row);
        });
    }

    // Отрисовка рисок на таймлайне
    function renderTimelineTicks() {
        timelineTicksEl.innerHTML = '';
        if (!audio.duration || isNaN(audio.duration) || currentBookmarks.length === 0) {
            return;
        }

        currentBookmarks.forEach(bm => {
            const tick = document.createElement('div');
            tick.className = 'timeline-tick-mark';
            const pct = (bm.time / audio.duration) * 100;
            tick.style.left = `${Math.min(100, Math.max(0, pct))}%`;

            tick.addEventListener('click', (e) => {
                e.stopPropagation();
                audio.currentTime = bm.time;
            });

            timelineTicksEl.appendChild(tick);
        });
    }

    /* ================= 8. A-B LOOP ================= */
    btnLoopA.addEventListener('click', () => {
        if (isEditMode) return;
        loopA = audio.currentTime;
        btnLoopA.classList.add('active');
        abStatus.textContent = `A: ${formatTime(loopA)}`;
        abStatus.style.color = 'var(--accent-amber)';
    });

    btnLoopB.addEventListener('click', () => {
        if (isEditMode) return;
        if (loopA !== null && audio.currentTime > loopA) {
            loopB = audio.currentTime;
            btnLoopB.classList.add('active');
            abStatus.textContent = `A-B: ${formatTime(loopA)} ➔ ${formatTime(loopB)}`;
            abStatus.style.color = 'var(--accent-green)';
        } else {
            alert('Сначала установите точку A до текущего момента!');
        }
    });

    btnLoopClear.addEventListener('click', () => {
        if (isEditMode) return;
        loopA = null;
        loopB = null;
        btnLoopA.classList.remove('active');
        btnLoopB.classList.remove('active');
        abStatus.textContent = 'ВЫКЛ';
        abStatus.style.color = 'var(--text-muted)';
    });

    /* ================= 9. ПЛЕЙЛИСТ И ПАПКИ ================= */
    openPlBtn.addEventListener('click', () => playlistSheet.classList.add('open'));
    closeSheetBtn.addEventListener('click', () => playlistSheet.classList.remove('open'));
    closeHandle.addEventListener('click', () => playlistSheet.classList.remove('open'));

    function loadFolders() {
        return fetch('/api/folders')
            .then(res => res.json())
            .then(data => {
                folders = data;
                folderDropdown.innerHTML = '';
                folders.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f;
                    opt.textContent = f === '' ? '📁 (Корень)' : `📁 ${f}`;
                    folderDropdown.appendChild(opt);
                });
            });
    }

    folderDropdown.addEventListener('change', () => {
        currentFolder = folderDropdown.value;
        localStorage.setItem('currentFolder', currentFolder);
        loadTracks();
    });

    btnCreateFolder.addEventListener('click', () => {
        const name = prompt('Введите имя новой папки:');
        if (!name) return;
        fetch('/api/folders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: name })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) alert(data.error);
            else {
                loadFolders().then(() => {
                    folderDropdown.value = name;
                    currentFolder = name;
                    localStorage.setItem('currentFolder', currentFolder);
                    loadTracks();
                });
            }
        });
    });

    btnRefreshPl.addEventListener('click', () => {
        loadFolders().then(() => {
            folderDropdown.value = currentFolder;
            loadTracks();
        });
    });

    function loadTracks() {
        const url = currentFolder ? `/api/files?folder=${encodeURIComponent(currentFolder)}` : '/api/files';
        fetch(url)
            .then(res => res.json())
            .then(data => {
                const savedOrder = customOrderMap[currentFolder] || [];
                if (savedOrder.length > 0) {
                    const map = new Map(data.map(t => [t.path, t]));
                    const sorted = [];
                    savedOrder.forEach(p => {
                        if (map.has(p)) {
                            sorted.push(map.get(p));
                            map.delete(p);
                        }
                    });
                    tracks = [...map.values(), ...sorted];
                } else {
                    tracks = data;
                }
                renderPlaylist();
            });
    }

    function renderPlaylist() {
        playlistEl.innerHTML = '';
        shelfInfo.textContent = `📑 ПЛЕЙЛИСТ (${tracks.length} ТРЕКОВ)`;

        tracks.forEach(track => {
            const li = document.createElement('li');
            li.className = 'pl-row-item';
            li.dataset.path = track.path;
            if (currentTrack && currentTrack.path === track.path) {
                li.classList.add('active');
            }

            li.innerHTML = `
                <div class="pl-drag-handle" title="Потяните для сортировки">☰</div>
                <span class="pl-row-name" title="${track.name}">${track.name}</span>
                <button class="pl-row-menu-btn" title="Действия">•••</button>
            `;

            li.querySelector('.pl-row-name').addEventListener('click', () => playTrack(track));

            const menuBtn = li.querySelector('.pl-row-menu-btn');
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                activeMenuTrack = track;
                const rect = menuBtn.getBoundingClientRect();
                ctxMenu.style.top = `${rect.bottom + 4}px`;
                ctxMenu.style.right = `${window.innerWidth - rect.right}px`;
                ctxMenu.classList.remove('hidden');
            });

            setupDragAndDrop(li.querySelector('.pl-drag-handle'), li);
            playlistEl.appendChild(li);
        });
    }

    ctxMoveBtn.addEventListener('click', () => {
        if (!activeMenuTrack) return;
        const folderListStr = folders.map((f, i) => `${i}: [${f === '' ? 'Корень' : f}]`).join('\n');
        const choice = prompt(`Куда переместить "${activeMenuTrack.name}"?\nВведите номер:\n${folderListStr}`);
        if (choice === null) return;
        const targetIdx = parseInt(choice, 10);
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= folders.length) {
            alert('Неверный номер');
            return;
        }

        fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: activeMenuTrack.path,
                targetFolder: folders[targetIdx]
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) alert(data.error);
            else loadTracks();
        });
    });

    ctxDeleteBtn.addEventListener('click', () => {
        if (!activeMenuTrack) return;
        if (confirm(`Удалить файл "${activeMenuTrack.name}"?`)) {
            fetch(`/api/delete/${encodeURIComponent(activeMenuTrack.path)}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.error) alert(data.error);
                    else loadTracks();
                });
        }
    });

    // Живой поиск
    searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        playlistEl.querySelectorAll('.pl-row-item').forEach(li => {
            const name = li.querySelector('.pl-row-name').textContent.toLowerCase();
            li.style.display = name.includes(q) ? 'flex' : 'none';
        });
    });

    // Drag-and-Drop в списке плейлиста
    let draggedRow = null;
    let dragPlaceholder = null;

    function setupDragAndDrop(handle, li) {
        const startDrag = (clientY) => {
            draggedRow = li;
            draggedRow.classList.add('dragging');
            dragPlaceholder = document.createElement('li');
            dragPlaceholder.className = 'pl-row-item';
            dragPlaceholder.style.border = '2px dashed var(--accent-green)';
            dragPlaceholder.style.height = `${draggedRow.offsetHeight}px`;
            playlistEl.insertBefore(dragPlaceholder, draggedRow.nextSibling);
        };

        const moveDrag = (clientY, clientX) => {
            if (!draggedRow) return;
            const target = document.elementFromPoint(clientX, clientY);
            const item = target ? target.closest('.pl-row-item:not(.dragging)') : null;
            if (item && item !== dragPlaceholder && playlistEl.contains(item)) {
                const rect = item.getBoundingClientRect();
                const next = (clientY - rect.top) / rect.height > 0.5;
                playlistEl.insertBefore(dragPlaceholder, next ? item.nextSibling : item);
            }
        };

        const endDrag = () => {
            if (!draggedRow) return;
            playlistEl.insertBefore(draggedRow, dragPlaceholder);
            dragPlaceholder.remove();
            draggedRow.classList.remove('dragging');

            const reordered = [];
            playlistEl.querySelectorAll('.pl-row-item').forEach(item => {
                const p = item.dataset.path;
                const found = tracks.find(t => t.path === p);
                if (found) reordered.push(found);
            });
            tracks = reordered;
            customOrderMap[currentFolder] = tracks.map(t => t.path);
            localStorage.setItem('customOrderMap', JSON.stringify(customOrderMap));

            draggedRow = null;
            dragPlaceholder = null;
        };

        handle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDrag(e.touches[0].clientY);
        }, { passive: false });

        handle.addEventListener('touchmove', (e) => {
            if (!draggedRow) return;
            e.preventDefault();
            moveDrag(e.touches[0].clientY, e.touches[0].clientX);
        }, { passive: false });

        handle.addEventListener('touchend', endDrag);

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientY);
            const onMouseMove = (ev) => moveDrag(ev.clientY, ev.clientX);
            const onMouseUp = () => {
                endDrag();
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    /* ================= 10. ЗАГРУЗЧИК ================= */
    dlModeYt.addEventListener('click', () => {
        currentDlMode = 'youtube';
        dlModeYt.classList.add('active');
        dlModeStream.classList.remove('active');
        dlUrlInput.placeholder = 'Вставьте ссылку на YouTube...';
    });

    dlModeStream.addEventListener('click', () => {
        currentDlMode = 'stream';
        dlModeStream.classList.add('active');
        dlModeYt.classList.remove('active');
        dlUrlInput.placeholder = 'Вставьте прямую ссылку потока (googlevideo / mp3)...';
    });

    srvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        srvMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', () => srvMenu.classList.add('hidden'));

    listenDirectBtn.addEventListener('click', () => {
        const url = dlUrlInput.value.trim();
        if (!url) {
            alert('Вставьте ссылку в поле!');
            return;
        }
        const name = dlCustomName.value.trim() || 'Прямой онлайн-поток';
        currentTrack = { name: name, path: '' };
        trackNameEl.textContent = name;
        audio.src = url;
        audio.preservesPitch = true;
        audio.playbackRate = currentSpeed;
        audio.play().then(() => {
            playBtn.textContent = '❚❚';
        }).catch(err => alert('Не удалось запустить онлайн: ' + err.message));
    });

    startDlBtn.addEventListener('click', () => {
        const url = dlUrlInput.value.trim();
        const customName = dlCustomName.value.trim();
        if (!url) return;

        startDlBtn.disabled = true;
        dlProgressBox.classList.remove('hidden');
        dlBarFill.style.width = '0%';
        dlStatusLabel.textContent = 'Инициализация...';
        dlStatusNum.textContent = '0%';

        fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                folder: currentFolder,
                mode: currentDlMode,
                customName: customName
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                startDlBtn.disabled = false;
                dlProgressBox.classList.add('hidden');
            } else {
                pollDownloadStatus();
            }
        })
        .catch(err => {
            alert('Ошибка сервера: ' + err);
            startDlBtn.disabled = false;
            dlProgressBox.classList.add('hidden');
        });
    });

    function pollDownloadStatus() {
        if (dlPollTimer) clearInterval(dlPollTimer);

        dlPollTimer = setInterval(() => {
            fetch('/api/download/status')
                .then(res => res.json())
                .then(st => {
                    const percent = st.progress || 0;
                    dlBarFill.style.width = `${percent}%`;
                    dlStatusNum.textContent = `${percent}%`;

                    if (st.status === 'downloading') {
                        dlStatusLabel.textContent = `Скачивание: ${percent}%`;
                    } else if (st.status === 'converting') {
                        dlStatusLabel.textContent = 'Конвертация в MP3 (192k)...';
                    } else if (st.status === 'done') {
                        dlBarFill.style.width = '100%';
                        dlStatusNum.textContent = '100%';
                        dlStatusLabel.textContent = 'Готово! Сохранено';
                        clearInterval(dlPollTimer);
                        startDlBtn.disabled = false;
                        dlUrlInput.value = '';
                        dlCustomName.value = '';
                        loadTracks();
                        setTimeout(() => dlProgressBox.classList.add('hidden'), 3500);
                    } else if (st.status === 'error') {
                        dlStatusLabel.textContent = 'Ошибка: ' + (st.error || 'Сбой');
                        clearInterval(dlPollTimer);
                        startDlBtn.disabled = false;
                    }
                })
                .catch(() => {
                    clearInterval(dlPollTimer);
                    startDlBtn.disabled = false;
                });
        }, 500);
    }

    /* ================= 11. ЭКРАН БЛОКИРОВКИ ================= */
    const lockBtn = document.getElementById('btn-lock-screen');
    const lockScreenBox = document.getElementById('lock-screen-box');
    const unlockPad = document.getElementById('unlock-trigger-zone');
    let unlockTimer = null;

    lockBtn.addEventListener('click', () => lockScreenBox.classList.remove('hidden'));

    function startUnlock() {
        unlockPad.style.borderColor = 'var(--accent-green)';
        unlockPad.style.color = 'var(--accent-green)';
        unlockTimer = setTimeout(() => {
            lockScreenBox.classList.add('hidden');
            unlockPad.style.borderColor = 'var(--accent-cyan)';
            unlockPad.style.color = 'var(--accent-cyan)';
        }, 600);
    }

    function cancelUnlock() {
        clearTimeout(unlockTimer);
        unlockPad.style.borderColor = 'var(--accent-cyan)';
        unlockPad.style.color = 'var(--accent-cyan)';
    }

    unlockPad.addEventListener('touchstart', (e) => { e.preventDefault(); startUnlock(); });
    unlockPad.addEventListener('touchend', cancelUnlock);
    unlockPad.addEventListener('mousedown', startUnlock);
    unlockPad.addEventListener('mouseup', cancelUnlock);

    /* ================= СТАРТ ================= */
    loadFolders().then(() => {
        folderDropdown.value = currentFolder;
        loadTracks();
    });
});