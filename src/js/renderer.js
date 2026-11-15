const { ipcRenderer, webFrame } = require('electron');
const path = require('path');

const AudioManager = require(path.join(__dirname, 'src', 'js', 'audioManager.js'));
const PlaylistManager = require(path.join(__dirname, 'src', 'js', 'playlist.js'));

const player = new AudioManager();
const playlistMgr = new PlaylistManager();

let queue = [];
let currentTrackData = null;
let lastPlaylistTrack = null;
let lastPlaylistId = null;
let isPlaylistOpen = false;
let isPlaylistDragging = false;

let promptCallback = null;
let confirmCallback = null;
let pendingTrackToAdd = null;

const el = {
    playBtn: document.getElementById('play-btn'),
    progressBar: document.getElementById('progress-bar'),
    currTime: document.getElementById('current-time'),
    durTime: document.getElementById('duration'),
    title: document.getElementById('song-title'),

    favBtn: document.getElementById('fav-btn'),
    listToggle: document.getElementById('list-toggle-btn'),
    playlistSidebar: document.getElementById('playlist-sidebar'),
    favList: document.getElementById('fav-list'),
    tabQueueBtn: document.getElementById('tab-queue-btn'),
    queueContainer: document.getElementById('queue-container'),
    queueList: document.getElementById('queue-list'),
    clearQueueBtn: document.getElementById('clear-queue-btn'),
    tabPlaylistBtn: document.getElementById('tab-playlists-btn'),
    playlistContainer: document.getElementById('playlists-container'),
    queueBackBtn: document.getElementById('queue-back-btn'),

    playlistsGridView: document.getElementById('playlists-grid-view'),
    playlistDetailView: document.getElementById('playlist-detail-view'),
    playlistsGrid: document.getElementById('playlists-grid'),
    backToGridBtn: document.getElementById('back-to-grid-btn'),
    currentPlaylistTitle: document.getElementById('current-playlist-title'),

    promptModal: document.getElementById('custom-prompt-modal'),
    promptTitle: document.getElementById('prompt-title'),
    promptInput: document.getElementById('prompt-input'),
    promptOk: document.getElementById('prompt-ok'),
    promptCancel: document.getElementById('prompt-cancel'),

    confirmModal: document.getElementById('custom-confirm-modal'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel'),

    addModal: document.getElementById('add-to-playlist-modal'),
    modalGrid: document.getElementById('modal-playlists-grid'),
    closeAddModalBtn: document.getElementById('close-add-modal-btn'),

    alertModal: document.getElementById('custom-alert-modal'),
    alertTitle: document.getElementById('alert-title'),
    alertMessage: document.getElementById('alert-message'),
    alertOk: document.getElementById('alert-ok'),

    ytToggle: document.getElementById('yt-toggle-btn'),
    ytPanel: document.getElementById('yt-panel'),
    ytInput: document.getElementById('yt-search-input'),
    ytClearBtn: document.getElementById('yt-clear-btn'),
    ytSearchBtn: document.getElementById('yt-search-btn'),
    ytResults: document.getElementById('yt-results'),
    ytClose: document.getElementById('yt-close-btn'),

    slow: document.getElementById('slow-btn'),
    speed: document.getElementById('speed-btn'),
    reverb: document.getElementById('reverb-btn'),
    btn8d: document.getElementById('8d-btn'),
    muffle: document.getElementById('muffle-btn'),
    bass: document.getElementById('bass-btn'),

    vol: document.getElementById('volume-slider'),
    loop: document.getElementById('loop-btn'),
    shuffle: document.getElementById('shuffle-btn'),
    closeBtn: document.getElementById('close-btn'),
    minBtn: document.getElementById('min-btn'),

    localBtn: document.getElementById('local-file-btn'),
    fileInput: document.getElementById('file-input'),

    themeDots: document.querySelectorAll('.theme-dot'),

    restartBtn: document.getElementById('restart-btn'),
    addBtn: document.getElementById('add-btn'),
    pipToggleBtn: document.getElementById('pip-toggle-btn'),
    pipPlayerContainer: document.getElementById('pip-player-container'),
    playerContainer: document.querySelector('.player-container'),
    pipExpandBtn: document.getElementById('pip-expand-btn'),
    pipCloseBtn: document.getElementById('pip-close-btn'),
    pipCoverImg: document.getElementById('pip-cover-img'),
    pipAmbientGlow: document.getElementById('pip-ambient-glow'),
    pipPlayBtn: document.getElementById('pip-play-btn'),
    pipPrevBtn: document.getElementById('pip-prev-btn'),
    pipNextBtn: document.getElementById('pip-next-btn'),
    pipLoopBtn: document.getElementById('pip-loop-btn'),
    pipShuffleBtn: document.getElementById('pip-shuffle-btn'),
    pipMuteBtn: document.getElementById('pip-mute-btn'),
    pipVolSlider: document.getElementById('pip-vol-slider'),
    pipFxBtn: document.getElementById('pip-fx-btn'),
    pipFxPopover: document.getElementById('pip-fx-popover'),
    pipProgressBar: document.getElementById('pip-progress-bar'),
    pipCurrTime: document.getElementById('pip-current-time'),
    pipDurTime: document.getElementById('pip-duration'),
    pipSongTitle: document.getElementById('pip-song-title'),
    pipSongArtist: document.getElementById('pip-song-artist'),
    pipPlayIcon: document.getElementById('pip-play-icon'),
    pipFavBtn: document.getElementById('pip-fav-btn'),
    pipResizeGrip: document.getElementById('pip-resize-grip'),
    pipFxSlow: document.getElementById('pip-fx-slow'),
    pipFxSpeed: document.getElementById('pip-fx-speed'),
    pipFxReverb: document.getElementById('pip-fx-reverb'),
    pipFxBass: document.getElementById('pip-fx-bass'),
    pipFx8d: document.getElementById('pip-fx-8d'),
    pipFxMuffle: document.getElementById('pip-fx-muffle'),

    importModal: document.getElementById('import-playlist-modal'),
    importUrlInput: document.getElementById('import-url-input'),
    importStartBtn: document.getElementById('import-start-btn'),
    importCloseBtn: document.getElementById('import-close-btn'),
    importStep1: document.getElementById('import-step-1'),
    importStep2: document.getElementById('import-step-2'),
    importProgressLabel: document.getElementById('import-progress-label'),
    importProgressFill: document.getElementById('import-progress-fill'),
    importStats: document.getElementById('import-stats'),
    importLog: document.getElementById('import-log'),
    importCancelBtn: document.getElementById('import-cancel-btn'),
    importDoneBtn: document.getElementById('import-done-btn'),
    importErrorMsg: document.getElementById('import-error-msg'),
    scaleDownBtn: document.getElementById('scale-down-btn'),
    scaleUpBtn: document.getElementById('scale-up-btn'),
    scaleLabel: document.getElementById('scale-label')
};


if (el.tabQueueBtn) {
    el.tabQueueBtn.onclick = () => {
        el.tabQueueBtn.classList.add('active');
        el.tabQueueBtn.style.background = '#6c5ce7';
        el.tabQueueBtn.style.color = 'white';
        if (el.tabPlaylistBtn) {
            el.tabPlaylistBtn.classList.remove('active');
            el.tabPlaylistBtn.style.background = 'transparent';
            el.tabPlaylistBtn.style.color = '#6c5ce7';
        }
        el.queueContainer.style.display = 'flex';
        if (el.playlistContainer) el.playlistContainer.style.display = 'none';
        renderQueue();
    };
}
if (el.tabPlaylistBtn) {
    el.tabPlaylistBtn.onclick = () => {
        el.tabPlaylistBtn.classList.add('active');
        el.tabPlaylistBtn.style.background = '#6c5ce7';
        el.tabPlaylistBtn.style.color = 'white';
        if (el.tabQueueBtn) {
            el.tabQueueBtn.classList.remove('active');
            el.tabQueueBtn.style.background = 'transparent';
            el.tabQueueBtn.style.color = '#6c5ce7';
        }
        if (el.playlistContainer) el.playlistContainer.style.display = 'flex';
        el.queueContainer.style.display = 'none';
    };
}
if (el.queueBackBtn) {
    el.queueBackBtn.onclick = () => {
        if (el.tabPlaylistBtn) el.tabPlaylistBtn.click();
    };
}
if (el.clearQueueBtn) {
    el.clearQueueBtn.onclick = () => {
        queue = [];
        renderQueue();
    };
}

function showPrompt(title, defaultValue, callback, maxLength = null) {
    el.promptTitle.innerText = title;
    el.promptInput.value = defaultValue || "";
    if (maxLength) el.promptInput.setAttribute('maxlength', maxLength);
    else el.promptInput.removeAttribute('maxlength');
    el.promptModal.classList.remove('hidden');
    promptCallback = callback;
    el.promptInput.focus();
}

function hidePrompt() {
    el.promptModal.classList.add('hidden');
    promptCallback = null;
}

el.promptOk.onclick = () => {
    if (promptCallback) promptCallback(el.promptInput.value);
    hidePrompt();
};
el.promptCancel.onclick = hidePrompt;
el.promptInput.onkeydown = (e) => {
    if (e.key === 'Enter') el.promptOk.click();
    if (e.key === 'Escape') hidePrompt();
};

function showConfirm(title, callback) {
    el.confirmTitle.innerText = title;
    el.confirmModal.classList.remove('hidden');
    confirmCallback = callback;
}

function hideConfirm() {
    el.confirmModal.classList.add('hidden');
    confirmCallback = null;
}

el.confirmOk.onclick = () => {
    if (confirmCallback) confirmCallback(true);
    hideConfirm();
};
el.confirmCancel.onclick = () => {
    if (confirmCallback) confirmCallback(false);
    hideConfirm();
};

function showCustomAlert(message, title = "Notice") {
    el.alertTitle.innerText = title;
    el.alertMessage.innerText = message;
    el.alertModal.classList.remove('hidden');
}
el.alertOk.onclick = () => {
    el.alertModal.classList.add('hidden');
};

function renderPlaylistsGrid() {
    el.playlistsGrid.innerHTML = '';


    const addCard = document.createElement('div');
    addCard.className = 'playlist-card';
    addCard.innerHTML = '<div class="playlist-card-icon" style="pointer-events: none;">+</div><div class="playlist-card-title" style="pointer-events: none;">NEW PLAYLIST</div>';
    addCard.ondragover = (e) => { e.preventDefault(); addCard.classList.add('drag-over'); };
    addCard.ondragleave = () => addCard.classList.remove('drag-over');
    addCard.ondrop = (e) => {
        e.preventDefault();
        addCard.classList.remove('drag-over');
        const data = e.dataTransfer.getData('text/plain');
        if (data && data.startsWith('playlist_')) {
            const fromIndex = parseInt(data.replace('playlist_', ''));
            playlistMgr.movePlaylist(fromIndex, 0);
            setTimeout(() => renderPlaylistsGrid(), 50);
        }
    };
    addCard.onclick = () => {
        if (isPlaylistDragging) return;
        showPrompt("New Playlist Name:", "", (name) => {
            if (name && name.trim()) {
                playlistMgr.createPlaylist(name.trim().substring(0, 12));
                renderPlaylistsGrid();
            }
        }, 12);
    };
    el.playlistsGrid.appendChild(addCard);

    const importCard = document.createElement('div');
    importCard.className = 'playlist-card';
    importCard.innerHTML = '<div class="playlist-card-icon" style="pointer-events: none;"><span class="import-music-badge"><span class="import-music-badge-plus">+</span><span>🎵</span></span></div><div class="playlist-card-title" style="pointer-events: none;">IMPORT</div>';
    importCard.onclick = () => {
        if (isPlaylistDragging) return;
        openImportModal();
    };
    el.playlistsGrid.appendChild(importCard);

    playlistMgr.getAllPlaylists().forEach((p, index) => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.draggable = true;
        
        card.innerHTML = `
            <button class="card-action-btn edit" title="Rename">✏️</button>
            <button class="card-action-btn delete" title="Delete">❌</button>
            <div class="playlist-card-icon" style="pointer-events: none;">🎵</div>
            <div class="playlist-card-title" style="pointer-events: none;">${p.name}</div>
            <div style="font-size: 8px; color: #888; margin-top: 2px; pointer-events: none;">${p.tracks.length} tracks</div>
        `;

        card.ondragstart = (e) => {
            isPlaylistDragging = true;
            e.dataTransfer.setData('text/plain', 'playlist_' + index);
            card.style.opacity = '0.5';
        };
        card.ondragend = () => {
            card.style.opacity = '1';
            setTimeout(() => isPlaylistDragging = false, 100);
        };

        card.ondragover = (e) => {
            e.preventDefault();
            card.classList.add('drag-over');
        };
        card.ondragleave = () => card.classList.remove('drag-over');
        card.ondrop = (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            const data = e.dataTransfer.getData('text/plain');
            if (data && data.startsWith('playlist_')) {
                const fromIndex = parseInt(data.replace('playlist_', ''));
                if (fromIndex !== index) {
                    playlistMgr.movePlaylist(fromIndex, index);
                    setTimeout(() => renderPlaylistsGrid(), 50);
                }
            } else if (data && data.startsWith('track_')) {
                const trackIdx = parseInt(data.replace('track_', ''));
                const activeP = playlistMgr.getPlaylist(playlistMgr.activeId);
                if (activeP && p.id !== activeP.id) {
                    const track = activeP.tracks[trackIdx];
                    activeP.tracks.splice(trackIdx, 1);
                    p.tracks.push(track);
                    playlistMgr.save();
                    renderPlaylistDetail(); 
                }
            }
        };

        card.onclick = (e) => {
            if (isPlaylistDragging) return;
            if (e.target.classList.contains('edit')) {
                showPrompt("Rename Playlist:", p.name, (newName) => {
                    if (newName && newName.trim()) {
                        p.name = newName.trim().substring(0, 12);
                        playlistMgr.save();
                        renderPlaylistsGrid();
                    }
                }, 12);
                return;
            }
            if (e.target.classList.contains('delete')) {
                showConfirm(`Delete '${p.name}'?`, (confirmed) => {
                    if (confirmed) {
                        if (!playlistMgr.deletePlaylist(p.id)) {
                            showCustomAlert("Cannot delete the last playlist!", "Error");
                        }
                        renderPlaylistsGrid();
                    }
                });
                return;
            }

            playlistMgr.setActive(p.id);
            openPlaylistDetail();
        };

        el.playlistsGrid.appendChild(card);
    });
}

function openPlaylistDetail() {
    el.playlistsGridView.style.display = 'none';
    el.playlistDetailView.style.display = 'flex';
    renderPlaylistDetail();
}

function openPlaylistsGrid() {
    el.playlistDetailView.style.display = 'none';
    el.playlistsGridView.style.display = 'flex';
    renderPlaylistsGrid();
}

el.backToGridBtn.onclick = openPlaylistsGrid;

function renderPlaylistDetail() {
    const activeP = playlistMgr.getPlaylist(playlistMgr.activeId);
    if (!activeP) return;
    
    el.currentPlaylistTitle.innerText = activeP.name;
    el.favList.innerHTML = '';
    
    if (activeP.tracks.length === 0) {
        el.favList.innerHTML = '<p style="text-align:center; margin-top:20px;">EMPTY LIST</p>';
        return;
    }

    activeP.tracks.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'fav-item';
        div.draggable = true;
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        
        let isCurrent = (currentTrackData && currentTrackData.url === track.url);
        let indicator = isCurrent ? '▶️ ' : '';

        div.innerHTML = `
            <div style="flex-grow:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color: ${isCurrent ? '#6c5ce7' : 'inherit'}; font-weight: ${isCurrent ? 'bold' : 'normal'};">
                ${indicator}${index + 1}. ${track.title}
            </div>
            <div style="display: flex; gap: 2px; align-items: center;">
                <button class="add-queue-btn" style="background: transparent; border: none; cursor: pointer; font-size: 11px; padding: 2px;" title="Add to Queue">➕</button>
                <button class="edit-track-btn" style="background: transparent; border: none; cursor: pointer; font-size: 11px; padding: 2px;" title="Rename">✏️</button>
                <button class="delete-btn" style="background: transparent; border: none; cursor: pointer; font-size: 11px; padding: 2px;" title="Remove">❌</button>
            </div>
        `;

        div.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', 'track_' + index);
            div.style.opacity = '0.5';
        };
        div.ondragend = () => div.style.opacity = '1';
        div.ondragover = (e) => e.preventDefault();
        div.ondrop = (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            if (data.startsWith('track_')) {
                const fromIndex = parseInt(data.replace('track_', ''));
                playlistMgr.move(fromIndex, index);
                renderPlaylistDetail();
            }
        };

        div.onclick = (e) => {
            if (e.target.closest('.delete-btn') || e.target.closest('.edit-track-btn') || e.target.closest('.add-queue-btn')) return;
            playTrack(track, playlistMgr.activeId, false);
        };

        const editBtn = div.querySelector('.edit-track-btn');
        editBtn.onclick = () => {
            showPrompt("Rename Track:", track.title, (newName) => {
                if (newName && newName.trim()) {
                    track.title = newName.trim();
                    playlistMgr.save();
                    renderPlaylistDetail();
                    
                    if (currentTrackData && currentTrackData.url === track.url) {
                        currentTrackData.title = track.title;
                        el.title.innerText = track.title.toUpperCase();
                        if (track.title.length > 15) el.title.classList.add('scrolling');
                        else el.title.classList.remove('scrolling');
                        syncPipTrackInfo(currentTrackData);
                    }
                }
            });
        };

        const delBtn = div.querySelector('.delete-btn');
        delBtn.onclick = () => {
            showConfirm(`Remove from playlist?`, (confirmed) => {
                if (confirmed) {
                    playlistMgr.remove(track.url);
                    renderPlaylistDetail();
                    checkFavStatus();
                }
            });
        };

        
        const qBtn = div.querySelector('.add-queue-btn');
        if (qBtn) {
            qBtn.onclick = (e) => {
                e.stopPropagation();
                queue.push(track);
                renderQueue();
                if (queue.length === 1 && !currentTrackData) playNext();
            };
        }

        el.favList.appendChild(div);
    });
}

function updatePipFavIcon(isFav) {
    if (!el.pipFavBtn) return;
    el.pipFavBtn.classList.toggle('active', isFav);
    if (isFav) {
        el.pipFavBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#1db954"/><path d="M8 12.5l2.5 2.5 5.5-5.5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else {
        el.pipFavBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8" stroke-linecap="round"/></svg>';
    }
}

function checkFavStatus() {
    if (!currentTrackData) {
        if (el.favBtn) el.favBtn.classList.remove('active');
        updatePipFavIcon(false);
        return;
    }
    const isFav = playlistMgr.getAllPlaylists().some(p => p.tracks.some(t => t.url === currentTrackData.url));
    if (el.favBtn) el.favBtn.classList.toggle('active', isFav);
    updatePipFavIcon(isFav);
}

el.favBtn.onclick = () => {
    if (!currentTrackData) {
        showCustomAlert("Play a track first!", "Oops!");
        return;
    }
    openAddTrackModal(currentTrackData);
};

let playlistResizeTimeout = null;
el.listToggle.onclick = () => {
    clearTimeout(playlistResizeTimeout);
    isPlaylistOpen = !isPlaylistOpen;
    if (isPlaylistOpen) {
        ipcRenderer.send('resize-window', 635, 575);
        el.playlistSidebar.classList.add('active');
    } else {
        el.playlistSidebar.classList.remove('active');
        playlistResizeTimeout = setTimeout(() => {
            if (!isPlaylistOpen) {
                ipcRenderer.send('resize-window', 340, 575);
            }
        }, 300);
    }
};

async function playTrack(track, forcePlaylistId = null, isFromQueue = false) {
    if (!isFromQueue) {
        let pId = forcePlaylistId || playlistMgr.activeId;
        let p = playlistMgr.getPlaylist(pId);
        let list = p ? p.tracks : [];
        if (list.some(t => t.url === track.url)) {
            lastPlaylistTrack = track;
            lastPlaylistId = pId;
        }
    }
    el.title.innerText = "LOADING...";
    el.title.classList.remove('scrolling');
    
    if (el.slow && el.slow.classList.contains('active')) player.setSpeed('slow');
    else if (el.speed && el.speed.classList.contains('active')) player.setSpeed('fast');
    
    if (track.type === 'youtube') {
        let result = await ipcRenderer.invoke('yt-get-stream', track.url);
        if (!result.success) {
            result = await ipcRenderer.invoke('yt-get-stream', track.url, true);
        }
        if (result.success) {
            player.play(result.url).catch(async () => {
                const retry = await ipcRenderer.invoke('yt-get-stream', track.url, true);
                if (retry.success) {
                    player.play(retry.url).catch(() => {});
                }
            });
            el.title.innerText = track.title.toUpperCase();
            if (track.title.length > 15) el.title.classList.add('scrolling');
            
            currentTrackData = track;
            el.playBtn.innerText = "❚❚";
            checkFavStatus();
            preloadNextTrack();
            renderPlaylistDetail();
            renderQueue();
            syncPipTrackInfo(track);
        } else {
            showCustomAlert("Broken link or no internet.", "Error");
            el.title.innerText = "ERROR";
        }
    } else if (track.type === 'local') {
        if (!track.thumbnail || track.thumbnail === 'assets/icon.png') {
            try {
                const cover = await ipcRenderer.invoke('get-local-cover', track.url);
                if (cover) {
                    track.thumbnail = cover;
                    playlistMgr.save();
                }
            } catch (e) { }
        }
        player.play(track.url);
        el.title.innerText = track.title.toUpperCase();
        if (track.title.length > 15) el.title.classList.add('scrolling');
        
        currentTrackData = track;
        el.playBtn.innerText = "❚❚";
        checkFavStatus();
        preloadNextTrack();
        renderPlaylistDetail();
        renderQueue();
        syncPipTrackInfo(track);
    }
}

el.localBtn.onclick = () => el.fileInput.click();

el.fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        let cover = null;
        try {
            cover = await ipcRenderer.invoke('get-local-cover', file.path);
        } catch (err) { }
        playTrack({
            title: file.name.replace(/\.[^/.]+$/, ""),
            url: file.path,
            thumbnail: cover || 'assets/icon.png',
            type: 'local'
        });
    }
};

el.themeDots.forEach(dot => {
    dot.onclick = () => {
        const theme = dot.getAttribute('data-theme');
        if (theme === 'default') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pixel_theme', theme);
    };
});
const savedTheme = localStorage.getItem('pixel_theme');
if (savedTheme && savedTheme !== 'default') document.documentElement.setAttribute('data-theme', savedTheme);

el.ytToggle.onclick = (e) => {
    if (e) e.stopPropagation();
    el.ytPanel.classList.toggle('hidden');
};

el.ytClose.onclick = (e) => {
    if (e) e.stopPropagation();
    el.ytPanel.classList.add('hidden');
};

document.addEventListener('dblclick', (e) => {
    if (e.target.classList.contains('custom-modal')) {
        e.target.classList.add('hidden');
        if (e.target === el.promptModal) promptCallback = null;
        if (e.target === el.confirmModal) confirmCallback = null;
        if (e.target === el.addModal) pendingTrackToAdd = null;
    }
});

function openAddTrackModal(trackData) {
    pendingTrackToAdd = trackData;
    el.modalGrid.innerHTML = '';
    
    playlistMgr.getAllPlaylists().forEach(p => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `<div class="playlist-card-icon">🎵</div><div class="playlist-card-title">${p.name}</div>`;
        card.onclick = () => {
            const exists = p.tracks.some(t => t.url === pendingTrackToAdd.url);
            if (!exists) {
                p.tracks.push(pendingTrackToAdd);
                playlistMgr.save();
                checkFavStatus(); 
            }
            el.addModal.classList.add('hidden');
            pendingTrackToAdd = null;
            
            if (isPlaylistOpen) {
                renderPlaylistsGrid();
                if (el.playlistDetailView.style.display !== 'none' && playlistMgr.activeId === p.id) {
                    renderPlaylistDetail();
                }
            }
        };
        el.modalGrid.appendChild(card);
    });
    
    el.addModal.classList.remove('hidden');
}

el.closeAddModalBtn.onclick = () => {
    el.addModal.classList.add('hidden');
    pendingTrackToAdd = null;
};

el.ytClearBtn.onclick = () => {
    el.ytInput.value = '';
    el.ytResults.innerHTML = '<p style="font-size: 8px; color: #7a6a81; text-align:center; margin-top:20px;">SEARCH TO PLAY</p>';
};

el.ytInput.onkeydown = (e) => {
    if (e.key === 'Enter') el.ytSearchBtn.click();
};

el.ytSearchBtn.onclick = async () => {
    const query = el.ytInput.value;
    if (!query) return;

    el.ytResults.innerHTML = '<p style="text-align:center; font-size:10px; margin-top:20px;">Searching...</p>';
    
    try {
        const videos = await ipcRenderer.invoke('yt-search-list', query);
        el.ytResults.innerHTML = '';
        
        if (!videos || videos.length === 0) {
            el.ytResults.innerHTML = '<p style="text-align:center; font-size:10px; margin-top:20px;">NO RESULTS</p>';
            return;
        }

        videos.forEach(v => {
            const div = document.createElement('div');
            div.className = 'yt-item';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            
            const isFav = playlistMgr.getAllPlaylists().some(p => p.tracks.some(t => t.url === v.url));
            
            div.innerHTML = `
                <img src="${v.thumbnail}" referrerpolicy="no-referrer" class="yt-thumb" style="width:40px; height:30px; object-fit:cover; border-radius:4px;">
                <div style="flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding-right: 4px;"><div style="margin-bottom:2px;">${v.title.substring(0, 30)}...</div><div style="color:#888;">${v.timestamp}</div></div>
                <div style="display: flex; gap: 2px; align-items: center;">
                    <button class="heart-btn add-queue-btn-yt" style="font-size: 11px; padding: 2px;" title="Add to Queue">➕</button>
                    <button class="heart-btn add-fav-btn ${isFav ? 'active' : ''}" style="font-size: 13px; padding: 2px;">❤</button>
                </div>
            `;
            
            div.onclick = (e) => {
                if(e.target.closest('.add-fav-btn') || e.target.closest('.add-queue-btn-yt')) return;
                playTrack({ title: v.title, url: v.url, thumbnail: v.thumbnail, type: 'youtube' });
            };
            
            const ytQBtn = div.querySelector('.add-queue-btn-yt');
            if (ytQBtn) {
                ytQBtn.onclick = (e) => {
                    e.stopPropagation();
                    queue.push({ title: v.title, url: v.url, thumbnail: v.thumbnail, type: 'youtube' });
                    renderQueue();
                    if (queue.length === 1 && !currentTrackData) playNext();
                };
            }
            
            const heartBtn = div.querySelector('.add-fav-btn');
            if (heartBtn) {
                heartBtn.onclick = (e) => {
                    e.stopPropagation();
                    openAddTrackModal({ title: v.title, url: v.url, thumbnail: v.thumbnail, type: 'youtube' });
                };
            }
            
            el.ytResults.appendChild(div);
        });
    } catch (err) {
        el.ytResults.innerHTML = `<p style="text-align:center; color:red; font-size:8px;">ERROR</p>`;
    }
};

el.playBtn.onclick = () => {
    const isPlaying = player.togglePlay();
    el.playBtn.innerText = isPlaying ? "❚❚" : "▶";
    updatePipPlayIcon(isPlaying);
};

if (el.restartBtn) el.restartBtn.onclick = () => player.setTime(0);

let preloadedNextTrackData = null;
let isShuffleEnabled = false;

function preloadNextTrack() {
    if (queue.length > 0) {
        if (queue[0].type === 'youtube') ipcRenderer.invoke('yt-get-stream', queue[0].url).catch(() => {});
        return;
    }
    const pId = lastPlaylistId || playlistMgr.activeId;
    const p = playlistMgr.getPlaylist(pId);
    if (!p || p.tracks.length === 0) return;
    const list = p.tracks;
    let nextTrack = null;
    let refTrack = lastPlaylistTrack || currentTrackData;
    if (!refTrack) return;
    if (isShuffleEnabled) {
        if (list.length > 1) {
            let rIdx = Math.floor(Math.random() * list.length);
            while (list[rIdx].url === refTrack.url) rIdx = Math.floor(Math.random() * list.length);
            nextTrack = list[rIdx];
        } else nextTrack = list[0];
    } else {
        const idx = list.findIndex(t => t.url === refTrack.url);
        if (idx !== -1 && idx < list.length - 1) nextTrack = list[idx + 1];
        else if (idx === list.length - 1) nextTrack = list[0];
    }
    preloadedNextTrackData = nextTrack;
    if (nextTrack && nextTrack.type === 'youtube') ipcRenderer.invoke('yt-get-stream', nextTrack.url).catch(() => {});
}

function playNext() {
    if (queue.length > 0) {
        const nextTrack = queue.shift();
        renderQueue();
        playTrack(nextTrack, null, true);
        return;
    }
    const pId = lastPlaylistId || playlistMgr.activeId;
    const p = playlistMgr.getPlaylist(pId);
    if (!p || p.tracks.length === 0) return;
    const list = p.tracks;
    
    if (preloadedNextTrackData && list.some(t => t.url === preloadedNextTrackData.url)) {
        playTrack(preloadedNextTrackData, pId, false);
    } else {
        if (isShuffleEnabled) {
            let rIdx = Math.floor(Math.random() * list.length);
            playTrack(list[rIdx], pId, false);
        } else {
            let refTrack = lastPlaylistTrack || currentTrackData;
            if (!refTrack) return;
            const idx = list.findIndex(t => t.url === refTrack.url);
            if (idx !== -1 && idx < list.length - 1) playTrack(list[idx + 1], pId, false);
            else playTrack(list[0], pId, false);
        }
    }
}

function playPrev() {
    const pId = lastPlaylistId || playlistMgr.activeId;
    const p = playlistMgr.getPlaylist(pId);
    if (!p || p.tracks.length === 0) return;
    const list = p.tracks;
    let refTrack = lastPlaylistTrack || currentTrackData;
    if (!refTrack) return;
    const idx = list.findIndex(t => t.url === refTrack.url);
    if (idx > 0) playTrack(list[idx - 1], pId, false);
    else playTrack(list[list.length - 1], pId, false);
}

if (el.addBtn) el.addBtn.onclick = playNext;
if (el.restartBtn) el.restartBtn.onclick = () => {
    if (player.currentTime > 3) player.setTime(0);
    else playPrev();
};

el.slow.onclick = () => {
    if (el.slow.classList.toggle('active')) {
        el.speed.classList.remove('active');
        player.setSpeed('slow');
    } else player.setSpeed('normal');
};

el.speed.onclick = () => {
    if (el.speed.classList.toggle('active')) {
        el.slow.classList.remove('active');
        player.setSpeed('fast');
    } else player.setSpeed('normal');
};

el.btn8d.onclick = () => player.set8D(el.btn8d.classList.toggle('active'));
el.bass.onclick = () => player.setBass(el.bass.classList.toggle('active'));
el.reverb.onclick = () => { el.reverb.classList.toggle('active'); player.setReverb(el.reverb.classList.contains('active')); };
el.muffle.onclick = () => { el.muffle.classList.toggle('active'); player.setMuffled(el.muffle.classList.contains('active')); };

el.vol.oninput = () => {
    player.setVolume(el.vol.value / 100);
    if (el.pipVolSlider) {
        el.pipVolSlider.value = el.vol.value;
        el.pipVolSlider.style.setProperty('--pip-vol-pct', el.vol.value + '%');
    }
};
el.loop.onclick = () => { el.loop.classList.toggle('active'); player.setLoop(el.loop.classList.contains('active')); };
el.shuffle.onclick = () => {
    isShuffleEnabled = !isShuffleEnabled;
    el.shuffle.classList.toggle('active', isShuffleEnabled);
    if (currentTrackData) preloadNextTrack();
};

player.onEnded(() => {
    if (!el.loop.classList.contains('active')) playNext();
});

let isDragging = false;
player.onTimeUpdate((curr, total) => {
    if (!isDragging) {
        const pct = total ? (curr / total) * 100 : 0;
        const cTime = formatTime(curr);
        const dTime = formatTime(total);
        el.progressBar.value = pct;
        el.currTime.innerText = cTime;
        el.durTime.innerText = dTime;
        if (el.pipProgressBar) {
            el.pipProgressBar.value = pct;
            el.pipProgressBar.style.setProperty('--pip-prog-pct', pct + '%');
            el.pipCurrTime.innerText = cTime;
            el.pipDurTime.innerText = dTime;
        }
    }
});

el.progressBar.oninput = () => {
    isDragging = true;
    const val = el.progressBar.value;
    const duration = player.duration;
    if (duration) el.currTime.innerText = formatTime((val / 100) * duration);
};

el.progressBar.onchange = () => {
    player.setTime(el.progressBar.value);
    isDragging = false;
    el.progressBar.blur();
};

el.closeBtn.onclick = () => window.close();
el.minBtn.onclick = () => ipcRenderer.send('minimize-app');

function formatTime(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

player.setVolume(el.vol.value / 100);
if (el.pipVolSlider) {
    el.pipVolSlider.value = el.vol.value;
    el.pipVolSlider.style.setProperty('--pip-vol-pct', el.vol.value + '%');
}

renderPlaylistsGrid();
function renderQueue() {
    if (!el.queueList) return;
    el.queueList.innerHTML = '';
    
    if (currentTrackData) {
        const div = document.createElement('div');
        div.className = 'yt-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <div style="flex-grow:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color: #6c5ce7; font-weight: bold; padding: 4px 0;">
                ▶️ ${currentTrackData.title}
            </div>
        `;
        el.queueList.appendChild(div);
    }
    
    if (queue.length === 0 && !currentTrackData) {
        el.queueList.innerHTML = '<p style="text-align:center; font-size:10px; margin-top:20px;">QUEUE EMPTY</p>';
        return;
    }
    
    queue.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'yt-item';
        div.draggable = true;
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        
        div.innerHTML = `
            <div style="flex-grow:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color: inherit; font-weight: normal; padding: 4px 0;">
                ${index + 1}. ${track.title}
            </div>
            <button class="delete-btn" style="background:transparent; color:white; border:none; padding:4px 6px; font-size:11px; opacity:0.7; cursor:pointer;" title="Remove">❌</button>
        `;

        div.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', 'queue_' + index);
            div.style.opacity = '0.5';
        };
        div.ondragend = () => div.style.opacity = '1';
        div.ondragover = (e) => e.preventDefault();
        div.ondrop = (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            if (data.startsWith('queue_')) {
                const fromIndex = parseInt(data.replace('queue_', ''));
                if (fromIndex !== index) {
                    const movedItem = queue.splice(fromIndex, 1)[0];
                    queue.splice(index, 0, movedItem);
                    renderQueue();
                    preloadNextTrack();
                }
            }
        };

        div.onclick = (e) => {
            if (e.target.closest('.delete-btn')) {
                e.stopPropagation();
                queue.splice(index, 1);
                renderQueue();
                preloadNextTrack();
                return;
            }
            const t = queue.splice(index, 1)[0];
            renderQueue();
            playTrack(t, null, true);
        };
        el.queueList.appendChild(div);
    });
}

let isPipMode = false;
let isPipMuted = false;
let pipPrevVol = 50;
let isPipExpandedSize = false;

function updatePipPlayIcon(isPlaying) {
    if (!el.pipPlayIcon) return;
    if (isPlaying) {
        el.pipPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    } else {
        el.pipPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
}

async function syncPipTrackInfo(track) {
    if (!track) return;
    if (track.type === 'local' && (!track.thumbnail || track.thumbnail === 'assets/icon.png')) {
        try {
            const cover = await ipcRenderer.invoke('get-local-cover', track.url);
            if (cover) {
                track.thumbnail = cover;
                playlistMgr.save();
            }
        } catch (e) { }
    }
    let coverUrl = track.thumbnail;
    if (track.url && (track.url.includes('youtube.com') || track.url.includes('youtu.be'))) {
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = track.url.match(regExp);
        if (match && match[2].length === 11) {
            coverUrl = `https://i.ytimg.com/vi/${match[2]}/hq720.jpg`;
        }
    }
    if (coverUrl && (coverUrl.includes('hqdefault.jpg') || coverUrl.includes('mqdefault.jpg'))) {
        coverUrl = coverUrl.replace(/hqdefault\.jpg|mqdefault\.jpg/, 'hq720.jpg');
    }
    if (!coverUrl) coverUrl = track.thumbnail || 'assets/icon.png';
    if (el.pipCoverImg) {
        el.pipCoverImg.onerror = () => {
            if (el.pipCoverImg.src.includes('hq720.jpg')) {
                el.pipCoverImg.src = el.pipCoverImg.src.replace('hq720.jpg', 'maxresdefault.jpg');
            } else if (el.pipCoverImg.src.includes('maxresdefault.jpg')) {
                el.pipCoverImg.src = el.pipCoverImg.src.replace('maxresdefault.jpg', 'mqdefault.jpg');
            }
        };
        el.pipCoverImg.src = coverUrl;
    }
    if (el.pipAmbientGlow) {
        el.pipAmbientGlow.onerror = () => {
            if (el.pipAmbientGlow.src.includes('hq720.jpg')) {
                el.pipAmbientGlow.src = el.pipAmbientGlow.src.replace('hq720.jpg', 'mqdefault.jpg');
            }
        };
        el.pipAmbientGlow.src = coverUrl;
    }
    if (el.pipSongTitle) {
        el.pipSongTitle.innerText = track.title || "kaaninho's mp3";
    }
    if (el.pipSongArtist) el.pipSongArtist.innerText = (track.type === 'youtube' ? 'YouTube Music' : 'Local Audio');
    updatePipPlayIcon(player.isPlaying);
    checkFavStatus();
    syncPipFxStatus();
}

function syncPipFxStatus() {
    if (!el.pipFxSlow) return;
    el.pipFxSlow.classList.toggle('active', el.slow.classList.contains('active'));
    el.pipFxSpeed.classList.toggle('active', el.speed.classList.contains('active'));
    el.pipFxReverb.classList.toggle('active', el.reverb.classList.contains('active'));
    el.pipFxBass.classList.toggle('active', el.bass.classList.contains('active'));
    el.pipFx8d.classList.toggle('active', el.btn8d.classList.contains('active'));
    el.pipFxMuffle.classList.toggle('active', el.muffle.classList.contains('active'));
    if (el.pipLoopBtn) el.pipLoopBtn.classList.toggle('active', el.loop.classList.contains('active'));
    if (el.pipShuffleBtn) el.pipShuffleBtn.classList.toggle('active', isShuffleEnabled);
}

function enterPipMode() {
    if (isPipMode) return;
    isPipMode = true;
    window.isPipActive = true;
    if (window.pauseGameLoop) window.pauseGameLoop();
    isPipExpandedSize = false;
    clearTimeout(playlistResizeTimeout);
    if (isPlaylistOpen) {
        isPlaylistOpen = false;
        el.playlistSidebar.classList.remove('active');
    }
    if (el.ytPanel && !el.ytPanel.classList.contains('hidden')) {
        el.ytPanel.classList.add('hidden');
    }
    if (currentTrackData) syncPipTrackInfo(currentTrackData);
    document.body.classList.add('pip-mode');
    if (el.playerContainer) el.playerContainer.style.display = 'none';
    if (el.pipPlayerContainer) el.pipPlayerContainer.style.display = 'flex';
    if (el.pipVolSlider && el.vol) {
        el.pipVolSlider.value = el.vol.value;
        el.pipVolSlider.style.setProperty('--pip-vol-pct', el.vol.value + '%');
    }
    ipcRenderer.send('resize-window', 290, 340, true);
    ipcRenderer.send('set-always-on-top', true);
}

function exitPipMode() {
    if (!isPipMode) return;
    isPipMode = false;
    window.isPipActive = false;
    if (window.resumeGameLoop) window.resumeGameLoop();
    isPipExpandedSize = false;
    clearTimeout(playlistResizeTimeout);
    document.body.classList.remove('pip-mode');
    if (el.pipPlayerContainer) el.pipPlayerContainer.style.display = 'none';
    if (el.playerContainer) el.playerContainer.style.display = 'flex';
    ipcRenderer.send('set-always-on-top', false);
    ipcRenderer.send('resize-window', 340, 575, true); 
}

if (el.pipToggleBtn) el.pipToggleBtn.onclick = enterPipMode;
if (el.pipExpandBtn) el.pipExpandBtn.onclick = exitPipMode;
if (el.pipCloseBtn) el.pipCloseBtn.onclick = () => window.close();

if (el.pipResizeGrip) {
    let isResizing = false;
    let startX = 0, startY = 0;
    let startW = 0, startH = 0;
    let hasMoved = false;

    el.pipResizeGrip.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isPipMode) return;
        isResizing = true;
        hasMoved = false;
        startX = e.screenX;
        startY = e.screenY;
        startW = window.outerWidth;
        startH = window.outerHeight;

        const onMouseMove = (ev) => {
            if (!isResizing) return;
            const deltaX = ev.screenX - startX;
            const deltaY = ev.screenY - startY;
            if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                hasMoved = true;
            }
            const delta = Math.max(deltaX, deltaY);
            const newW = Math.round(Math.min(360, Math.max(290, startW + delta)));
            const newH = Math.round(newW * (340 / 290));
            ipcRenderer.send('resize-window', newW, newH, false);
        };

        const onMouseUp = () => {
            if (!isResizing) return;
            isResizing = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            if (!hasMoved) {
                isPipExpandedSize = !isPipExpandedSize;
                if (isPipExpandedSize) {
                    ipcRenderer.send('resize-window', 360, 422, true);
                } else {
                    ipcRenderer.send('resize-window', 290, 340, true);
                }
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });
}

if (el.pipPlayBtn) el.pipPlayBtn.onclick = () => {
    el.playBtn.click();
};

if (el.pipNextBtn) el.pipNextBtn.onclick = () => playNext();
if (el.pipPrevBtn) el.pipPrevBtn.onclick = () => {
    if (player.currentTime > 3) player.setTime(0);
    else playPrev();
};

if (el.pipLoopBtn) el.pipLoopBtn.onclick = () => {
    el.loop.click();
    syncPipFxStatus();
};

if (el.pipShuffleBtn) el.pipShuffleBtn.onclick = () => {
    el.shuffle.click();
    syncPipFxStatus();
};

if (el.pipFavBtn) {
    el.pipFavBtn.onclick = () => {
        if (!currentTrackData) return;
        const allPlaylists = playlistMgr.getAllPlaylists();
        const defaultPl = playlistMgr.getPlaylist('default') || allPlaylists[0];
        if (defaultPl) {
            const idx = defaultPl.tracks.findIndex(t => t.url === currentTrackData.url);
            if (idx !== -1) {
                defaultPl.tracks.splice(idx, 1);
            } else {
                defaultPl.tracks.push(currentTrackData);
            }
            playlistMgr.savePlaylists();
            checkFavStatus();
            renderPlaylistDetail();
        }
    };
}

if (el.pipVolSlider) {
    const volGroup = el.pipVolSlider.closest('.pip-vol-group');
    el.pipVolSlider.addEventListener('mousedown', () => {
        if (volGroup) volGroup.classList.add('holding');
    });
    window.addEventListener('mouseup', () => {
        if (volGroup) volGroup.classList.remove('holding');
    });
    el.pipVolSlider.oninput = (e) => {
        el.vol.value = e.target.value;
        player.setVolume(e.target.value / 100);
        el.pipVolSlider.style.setProperty('--pip-vol-pct', e.target.value + '%');
        isPipMuted = (e.target.value == 0);
        if (el.pipMuteBtn) {
            el.pipMuteBtn.innerHTML = isPipMuted
                ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
                : '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
        }
    };
}

if (el.pipMuteBtn) {
    el.pipMuteBtn.onclick = () => {
        if (!isPipMuted) {
            pipPrevVol = el.vol.value;
            el.vol.value = 0;
            player.setVolume(0);
            if (el.pipVolSlider) {
                el.pipVolSlider.value = 0;
                el.pipVolSlider.style.setProperty('--pip-vol-pct', '0%');
            }
            isPipMuted = true;
            el.pipMuteBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
        } else {
            const restore = pipPrevVol || 50;
            el.vol.value = restore;
            player.setVolume(restore / 100);
            if (el.pipVolSlider) {
                el.pipVolSlider.value = restore;
                el.pipVolSlider.style.setProperty('--pip-vol-pct', restore + '%');
            }
            isPipMuted = false;
            el.pipMuteBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
        }
    };
}

if (el.pipProgressBar) {
    el.pipProgressBar.oninput = () => {
        isDragging = true;
        const val = el.pipProgressBar.value;
        el.pipProgressBar.style.setProperty('--pip-prog-pct', val + '%');
        const duration = player.duration;
        if (duration) el.pipCurrTime.innerText = formatTime((val / 100) * duration);
    };
    el.pipProgressBar.onchange = () => {
        player.setTime(el.pipProgressBar.value);
        isDragging = false;
        el.pipProgressBar.blur();
    };
}

if (el.pipFxBtn) {
    el.pipFxBtn.onclick = (e) => {
        e.stopPropagation();
        if (el.pipFxPopover) el.pipFxPopover.classList.toggle('hidden');
        syncPipFxStatus();
    };
}
document.addEventListener('click', (e) => {
    if (el.pipFxPopover && !el.pipFxPopover.contains(e.target) && e.target !== el.pipFxBtn) {
        el.pipFxPopover.classList.add('hidden');
    }
});

if (el.pipFxSlow) el.pipFxSlow.onclick = () => { el.slow.click(); syncPipFxStatus(); };
if (el.pipFxSpeed) el.pipFxSpeed.onclick = () => { el.speed.click(); syncPipFxStatus(); };
if (el.pipFxReverb) el.pipFxReverb.onclick = () => { el.reverb.click(); syncPipFxStatus(); };
if (el.pipFxBass) el.pipFxBass.onclick = () => { el.bass.click(); syncPipFxStatus(); };
if (el.pipFx8d) el.pipFx8d.onclick = () => { el.btn8d.click(); syncPipFxStatus(); };
if (el.pipFxMuffle) el.pipFxMuffle.onclick = () => { el.muffle.click(); syncPipFxStatus(); };

ipcRenderer.on('global-shortcut-play-pause', () => {
    el.playBtn.click();
});
ipcRenderer.on('global-shortcut-next', () => {
    playNext();
});
ipcRenderer.on('global-shortcut-prev', () => {
    if (player.currentTime > 3) player.setTime(0);
    else playPrev();
});

function changeVolume(delta) {
    let currentVol = parseFloat(el.vol.value);
    let newVol = Math.min(100, Math.max(0, currentVol + delta));
    el.vol.value = newVol;
    player.setVolume(newVol / 100);
    if (el.pipVolSlider) {
        el.pipVolSlider.value = newVol;
        el.pipVolSlider.style.setProperty('--pip-vol-pct', newVol + '%');
    }
    isPipMuted = (newVol === 0);
    if (el.pipMuteBtn) {
        el.pipMuteBtn.innerHTML = isPipMuted
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
            : '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    }
}

ipcRenderer.on('global-shortcut-vol-up', () => {
    changeVolume(2);
});

ipcRenderer.on('global-shortcut-vol-down', () => {
    changeVolume(-2);
});

window.addEventListener('keydown', (e) => {
    if (e.altKey) {
        if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd') {
            e.preventDefault();
            changeVolume(2);
        } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
            e.preventDefault();
            changeVolume(-2);
        }
    } else if (isPlaylistOpen && !e.ctrlKey && !e.metaKey) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') {
            return;
        }
        if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            const delta = e.key === 'PageUp' ? -200 : -60;
            if (el.playlistDetailView && el.playlistDetailView.style.display !== 'none') {
                el.favList.scrollBy({ top: delta, behavior: 'smooth' });
            } else if (el.queueContainer && el.queueContainer.style.display === 'flex') {
                el.queueList.scrollBy({ top: delta, behavior: 'smooth' });
            } else if (el.playlistsGridView) {
                el.playlistsGridView.scrollBy({ top: delta, behavior: 'smooth' });
            }
        } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            const delta = e.key === 'PageDown' ? 200 : 60;
            if (el.playlistDetailView && el.playlistDetailView.style.display !== 'none') {
                el.favList.scrollBy({ top: delta, behavior: 'smooth' });
            } else if (el.queueContainer && el.queueContainer.style.display === 'flex') {
                el.queueList.scrollBy({ top: delta, behavior: 'smooth' });
            } else if (el.playlistsGridView) {
                el.playlistsGridView.scrollBy({ top: delta, behavior: 'smooth' });
            }
        }
    }
});

if (el.pipCoverImg && el.pipAmbientGlow) {
    new MutationObserver(() => {
        if (el.pipAmbientGlow.src !== el.pipCoverImg.src) {
            el.pipAmbientGlow.src = el.pipCoverImg.src;
        }
    }).observe(el.pipCoverImg, { attributes: true, attributeFilter: ['src'] });
}


let importCancelled = false;

function openImportModal() {
    el.importModal.classList.remove('hidden');
    el.importStep1.style.display = 'flex';
    el.importStep2.style.display = 'none';
    if (el.importErrorMsg) {
        el.importErrorMsg.style.display = 'none';
        el.importErrorMsg.innerText = '';
    }
    el.importUrlInput.value = '';
    el.importUrlInput.focus();
}

function closeImportModal() {
    el.importModal.classList.add('hidden');
    importCancelled = true;
    ipcRenderer.invoke('import-youtube-cancel');
}

el.importCloseBtn.onclick = closeImportModal;

el.importUrlInput.oninput = () => {
    if (el.importErrorMsg) el.importErrorMsg.style.display = 'none';
};

el.importUrlInput.onkeydown = (e) => {
    if (e.key === 'Enter') el.importStartBtn.click();
    if (e.key === 'Escape') closeImportModal();
};

el.importDoneBtn.onclick = () => {
    closeImportModal();
    renderPlaylistsGrid();
};

el.importCancelBtn.onclick = () => {
    importCancelled = true;
    ipcRenderer.invoke('import-youtube-cancel');
    el.importCancelBtn.style.display = 'none';
};

function importLogAdd(text, status) {
    const item = document.createElement('div');
    item.className = 'import-log-item';
    const label = status === 'ok' ? '✓' : (status === 'fail' ? '✗' : '⊘');
    const cls = status === 'ok' ? 'import-log-ok' : (status === 'fail' ? 'import-log-fail' : 'import-log-skip');
    item.innerHTML = '<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + text + '</span><span class="' + cls + '">' + label + '</span>';
    el.importLog.appendChild(item);
    el.importLog.scrollTop = el.importLog.scrollHeight;
}

el.importStartBtn.onclick = async () => {
    const url = el.importUrlInput.value.trim();
    if (!url) {
        if (el.importErrorMsg) {
            el.importErrorMsg.innerText = 'Please enter a playlist URL.';
            el.importErrorMsg.style.display = 'block';
        }
        return;
    }

    const platform = await ipcRenderer.invoke('import-detect-platform', url);
    if (!platform) {
        if (el.importErrorMsg) {
            el.importErrorMsg.innerText = 'Invalid link. Paste a Spotify or YouTube Music playlist URL.';
            el.importErrorMsg.style.display = 'block';
        }
        return;
    }

    importCancelled = false;
    el.importStep1.style.display = 'none';
    el.importStep2.style.display = 'flex';
    el.importLog.innerHTML = '';
    el.importProgressFill.style.width = '0%';
    el.importStats.innerText = '';
    el.importDoneBtn.style.display = 'none';
    el.importCancelBtn.style.display = 'block';

    if (platform === 'youtube') {
        await importYouTubePlaylist(url);
    } else {
        await importSpotifyPlaylist(url);
    }
};

async function importYouTubePlaylist(url) {
    el.importProgressLabel.innerText = 'Fetching YouTube playlist...';
    el.importProgressFill.style.width = '10%';
    el.importStats.innerText = '';

    const result = await ipcRenderer.invoke('import-youtube-tracks', url);
    const tracks = (result && result.tracks && Array.isArray(result.tracks)) ? result.tracks : [];

    if (!result.success || tracks.length === 0) {
        el.importProgressLabel.innerText = 'Failed to load playlist.';
        el.importStats.innerText = result.error || 'No tracks found.';
        el.importCancelBtn.style.display = 'none';
        el.importDoneBtn.style.display = 'block';
        return;
    }

    const rawName = result.title || 'YT Music';
    const playlistName = rawName.trim().substring(0, 12);
    const newId = playlistMgr.createPlaylist(playlistName);
    playlistMgr.setActive(newId);

    let added = 0;
    let failed = 0;

    for (let i = 0; i < tracks.length; i++) {
        if (importCancelled) break;

        const track = tracks[i];
        const pct = Math.round(((i + 1) / tracks.length) * 100);
        el.importProgressFill.style.width = pct + '%';
        el.importProgressLabel.innerText = 'Imported tracks: ' + (i + 1) + '/' + tracks.length;

        const wasAdded = playlistMgr.add({
            title: track.title,
            url: track.url,
            thumbnail: track.thumbnail || 'assets/icon.png',
            type: 'youtube'
        });

        if (wasAdded) {
            added++;
            importLogAdd(track.title, 'ok');
        } else {
            failed++;
            importLogAdd(track.title, 'skip');
        }

        el.importStats.innerText = added + ' added \u00B7 ' + failed + ' failed \u00B7 ' + (tracks.length - i - 1) + ' remaining';
        await new Promise(r => setTimeout(r, 45));
    }

    el.importProgressLabel.innerText = importCancelled ? 'Import cancelled.' : 'Import completed!';
    el.importProgressFill.style.width = '100%';
    el.importStats.innerText = added + ' added \u00B7 ' + failed + ' failed';
    el.importCancelBtn.style.display = 'none';
    el.importDoneBtn.style.display = 'block';
    renderPlaylistsGrid();
}

async function importSpotifyPlaylist(url) {
    el.importProgressLabel.innerText = 'Fetching Spotify playlist...';
    el.importProgressFill.style.width = '5%';
    el.importStats.innerText = '';

    const result = await ipcRenderer.invoke('import-spotify-tracks', url);
    const spotifyTracks = (result && result.tracks && Array.isArray(result.tracks)) ? result.tracks : (Array.isArray(result) ? result : []);

    if (!result.success || spotifyTracks.length === 0) {
        el.importProgressLabel.innerText = 'Failed to load playlist.';
        el.importStats.innerText = result.error || 'No tracks found. Make sure the playlist is public.';
        el.importCancelBtn.style.display = 'none';
        el.importDoneBtn.style.display = 'block';
        return;
    }

    const rawName = result.title || 'Spotify';
    const playlistName = rawName.trim().substring(0, 12);
    const newId = playlistMgr.createPlaylist(playlistName);
    playlistMgr.setActive(newId);

    let matched = 0;
    let failed = 0;

    for (let i = 0; i < spotifyTracks.length; i++) {
        if (importCancelled) break;

        const st = spotifyTracks[i];
        const displayName = st.title + (st.artist ? ' - ' + st.artist : '');
        const pct = Math.round(10 + ((i + 1) / spotifyTracks.length) * 90);
        el.importProgressFill.style.width = pct + '%';
        el.importProgressLabel.innerText = 'Matched tracks: ' + (i + 1) + '/' + spotifyTracks.length;

        const matchResult = await ipcRenderer.invoke('import-match-spotify', st);

        if (matchResult.success && matchResult.track) {
            const wasAdded = playlistMgr.add({
                title: matchResult.track.title,
                url: matchResult.track.url,
                thumbnail: matchResult.track.thumbnail || 'assets/icon.png',
                type: 'youtube'
            });
            if (wasAdded) {
                matched++;
                importLogAdd(displayName, 'ok');
            } else {
                failed++;
                importLogAdd(displayName, 'skip');
            }
        } else {
            failed++;
            importLogAdd(displayName, 'fail');
        }

        el.importStats.innerText = matched + ' added \u00B7 ' + failed + ' failed \u00B7 ' + (spotifyTracks.length - i - 1) + ' remaining';
    }

    el.importProgressLabel.innerText = importCancelled ? 'Import cancelled.' : 'Import completed!';
    el.importProgressFill.style.width = '100%';
    el.importStats.innerText = matched + ' added \u00B7 ' + failed + ' failed';
    el.importCancelBtn.style.display = 'none';
    el.importDoneBtn.style.display = 'block';
    renderPlaylistsGrid();
}
