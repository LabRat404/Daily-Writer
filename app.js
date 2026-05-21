let SERVER_URL = localStorage.getItem('custom_server_url') || '';

let selectedRate = null;
const ratings = document.querySelectorAll('.rating-btn');
const pushBtn = document.getElementById('pushBtn');
const statusDiv = document.getElementById('status');
const commentBox = document.getElementById('comment');
const wordCountDisplay = document.getElementById('wordCount');
const submitBtn = document.getElementById('submitBtn');
const mediaInput = document.getElementById('mediaInput');
const filePreviewText = document.getElementById('filePreviewText');
const imgPreview = document.getElementById('imgPreview');
const videoPreview = document.getElementById('videoPreview');

const toggleSettingsBtn = document.getElementById('toggleSettings');
const settingsPanel = document.getElementById('settings-panel');
const serverUrlInput = document.getElementById('serverUrlInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const MAX_WORDS = 33;
let selectedFile = null;
let objectUrl = null;
let isServerReachable = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered!'))
            .catch(err => console.error('Registration failed:', err));
    });
}

serverUrlInput.value = SERVER_URL;

toggleSettingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
});

saveSettingsBtn.addEventListener('click', () => {
    let rawUrl = serverUrlInput.value.trim();
    if (rawUrl.endsWith('/')) {
        rawUrl = rawUrl.slice(0, -1);
    }
    SERVER_URL = rawUrl;
    localStorage.setItem('custom_server_url', SERVER_URL);
    settingsPanel.style.display = 'none';
    alert("Server URL saved. Checking connection...");
    checkServer();
});

function saveAppState() {
    const stateData = { draftComment: commentBox.value, draftRating: selectedRate };
    localStorage.setItem('pwa_app_state', JSON.stringify(stateData));
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveAppState();
    else if (document.visibilityState === 'visible') checkDailyLock();
});

window.addEventListener('load', () => {
    const savedState = localStorage.getItem('pwa_app_state');
    if (savedState) {
        try {
            const stateData = JSON.parse(savedState);
            if (stateData.draftComment) {
                commentBox.value = stateData.draftComment;
                commentBox.dispatchEvent(new Event('input'));
            }
            if (stateData.draftRating) {
                selectedRate = stateData.draftRating;
                ratings.forEach(b => {
                    if (b.getAttribute('data-val') === selectedRate) b.classList.add('selected');
                });
            }
        } catch (e) { }
    }
});

let db;
const request = indexedDB.open("DailyTrackerMedia", 1);
request.onupgradeneeded = e => { e.target.result.createObjectStore("media"); };
request.onsuccess = e => { db = e.target.result; };

function saveMediaOffline(file, id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not ready");
        const tx = db.transaction("media", "readwrite");
        tx.objectStore("media").put(file, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject();
    });
}

function getAllOfflineMedia() {
    return new Promise((resolve) => {
        if (!db) return resolve({});
        const tx = db.transaction("media", "readonly");
        const store = tx.objectStore("media");
        const mediaFiles = {};
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                mediaFiles[cursor.key] = cursor.value;
                cursor.continue();
            } else resolve(mediaFiles);
        };
        cursorReq.onerror = () => resolve({});
    });
}

function clearOfflineMedia() {
    if (!db) return;
    db.transaction("media", "readwrite").objectStore("media").clear();
}

function getLocalDateFormat() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let countdownInterval;

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    const timerDisplay = document.getElementById('countdownTimer');
    if (!timerDisplay) return;

    countdownInterval = setInterval(() => {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff = tomorrow - now;
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        timerDisplay.innerText = `Unlocks in: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        if (diff <= 0) { clearInterval(countdownInterval); checkDailyLock(); }
    }, 1000);
}

function checkDailyLock() {
    const todayStr = getLocalDateFormat();
    if (localStorage.getItem('lastLogDate') === todayStr) {
        document.getElementById('input-section').classList.add('hidden');
        document.getElementById('done-message').classList.remove('hidden');
        startCountdown();
    } else {
        document.getElementById('input-section').classList.remove('hidden');
        document.getElementById('done-message').classList.add('hidden');
        if (countdownInterval) clearInterval(countdownInterval);
    }
}

function clearForm() {
    commentBox.value = '';
    selectedRate = null;
    ratings.forEach(b => b.classList.remove('selected'));
    wordCountDisplay.innerText = `0 / ${MAX_WORDS} words`;
    wordCountDisplay.className = 'word-count';
    selectedFile = null;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    filePreviewText.innerText = "No file selected";
    imgPreview.style.display = 'none';
    videoPreview.style.display = 'none';
    if (mediaInput) mediaInput.value = '';
    saveAppState();
}

function getWordCount(text) {
    const trimmed = text.trim();
    return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

commentBox.addEventListener('input', () => {
    let words = commentBox.value.trim().split(/\s+/);
    if (words.length > MAX_WORDS && commentBox.value.trim() !== '') {
        words = words.slice(0, MAX_WORDS);
        commentBox.value = words.join(" ") + " ";
    }
    const currentCount = getWordCount(commentBox.value);
    wordCountDisplay.innerText = `${currentCount} / ${MAX_WORDS} words`;
    wordCountDisplay.className = currentCount >= MAX_WORDS ? 'word-count limit-reached' : 'word-count';
    saveAppState();
});

ratings.forEach(btn => {
    btn.addEventListener('click', () => {
        ratings.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRate = btn.getAttribute('data-val');
        saveAppState();
    });
});

mediaInput.addEventListener('change', (e) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        filePreviewText.innerText = `Ready: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`;
        objectUrl = URL.createObjectURL(selectedFile);
        if (selectedFile.type.startsWith('image/')) {
            imgPreview.src = objectUrl; imgPreview.style.display = 'block'; videoPreview.style.display = 'none';
        } else if (selectedFile.type.startsWith('video/')) {
            videoPreview.src = objectUrl; videoPreview.style.display = 'block'; imgPreview.style.display = 'none';
        }
    } else {
        selectedFile = null; filePreviewText.innerText = "No file selected";
        imgPreview.style.display = 'none'; videoPreview.style.display = 'none';
    }
});

submitBtn.addEventListener('click', async () => {
    if (!selectedRate) return alert("Please select a rating first!");
    if (getWordCount(commentBox.value) > MAX_WORDS) return alert(`Over the ${MAX_WORDS} word limit!`);

    const d = new Date();
    const localDateTime = `${getLocalDateFormat()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    const uniqueRecordId = d.getTime().toString();
    const record = { id: uniqueRecordId, datetime: localDateTime, rate: selectedRate, comment: commentBox.value.trim(), hasMedia: !!selectedFile };

    let records = JSON.parse(localStorage.getItem('offlineRecords') || '[]');
    records.push(record);
    localStorage.setItem('offlineRecords', JSON.stringify(records));

    if (selectedFile) await saveMediaOffline(selectedFile, uniqueRecordId);

    localStorage.setItem('lastLogDate', getLocalDateFormat());
    checkDailyLock();
    updatePushCount();
    clearForm();
});

function updatePushCount() {
    const records = JSON.parse(localStorage.getItem('offlineRecords') || '[]');
    if (records.length > 0 && isServerReachable) {
        pushBtn.innerText = `Push Offline Log to Server`;
        pushBtn.style.display = 'block';
    } else { pushBtn.style.display = 'none'; }

    if (!isServerReachable) {
        let msg = records.length > 0 ? `<br><span style="font-size: 0.85rem; color: #94a3b8; font-weight: normal; margin-top: 5px; display: inline-block;">📥 ${records.length} record(s) queued</span>` : '';
        statusDiv.innerHTML = SERVER_URL ? `🔴 Offline (Saved Locally) ${msg}` : `⚠️ Please configure Server URL in Settings.`;
        statusDiv.style.color = "#ef4444";
    }
}

function setOfflineUI() { isServerReachable = false; updatePushCount(); }

async function verifyServerDate() {
    try {
        const res = await fetch(`${SERVER_URL}/check_date?date=${getLocalDateFormat()}`);
        if (res.ok) {
            const data = await res.json();
            if (data.exists) { localStorage.setItem('lastLogDate', getLocalDateFormat()); checkDailyLock(); }
        }
    } catch (e) { }
}

async function checkServer() {
    if (!navigator.onLine || !SERVER_URL) { setOfflineUI(); return; }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`${SERVER_URL}/ping`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            isServerReachable = true;
            statusDiv.innerText = "🟢 Connected to server";
            statusDiv.style.color = "#10b981";
            verifyServerDate();
            updatePushCount();
        } else setOfflineUI();
    } catch (e) { setOfflineUI(); }
}

pushBtn.addEventListener('click', async () => {
    if (!navigator.onLine || !isServerReachable || !SERVER_URL) return alert("You are currently offline or server is unreachable!");

    const records = JSON.parse(localStorage.getItem('offlineRecords') || '[]');
    if (records.length === 0) return;

    pushBtn.disabled = true;
    pushBtn.innerText = "Pushing Data & Media...";

    try {
        const formData = new FormData();
        formData.append('records', JSON.stringify(records));
        const mediaFiles = await getAllOfflineMedia();

        records.forEach((rec, index) => {
            if (rec.hasMedia && mediaFiles[rec.id]) {
                formData.append(`media_${index}`, mediaFiles[rec.id], mediaFiles[rec.id].name);
            }
        });

        const res = await fetch(`${SERVER_URL}/push`, { method: 'POST', body: formData });
        if (res.ok) {
            localStorage.removeItem('offlineRecords');
            clearOfflineMedia();
            pushBtn.style.display = 'none';
            alert("Data pushed successfully!");
        } else alert("Server rejected the push.");
    } catch (e) { alert("Failed to push data. Ensure your server is running."); }
    finally { pushBtn.disabled = false; updatePushCount(); }
});

window.addEventListener('offline', setOfflineUI);
window.addEventListener('online', checkServer);

checkDailyLock();
updatePushCount();
checkServer();
setInterval(() => { checkServer(); checkDailyLock(); }, 4000);