// DOM Elements
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const videoFeed = document.getElementById('video-feed');
const videoPlaceholder = document.getElementById('video-placeholder');
const cameraStatusBadge = document.getElementById('camera-status-badge');

const currentSignalValue = document.getElementById('current-signal-value');
const actionDisplay = document.getElementById('action-display');
const glowLayer = document.getElementById('glow-layer');

const audioToggle = document.getElementById('audio-toggle');
const audioIconWrapper = document.querySelector('.audio-icon-wrapper');
const audioStatusText = document.querySelector('.active-text');

const logContainer = document.getElementById('log-container');
const clearLogBtn = document.getElementById('clear-log-btn');

// State
let isCameraRunning = false;
let statusInterval;
let isAudioActive = true;
let previousSignal = null;

// API Endpoints
const VIDEO_ENDPOINT = window.location.origin + '/video_feed';
const STATUS_ENDPOINT = window.location.origin + '/signal_status';
const HISTORY_ENDPOINT = window.location.origin + '/history';

// Start Connect Camera
startBtn.addEventListener('click', () => {
    isCameraRunning = true;
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    cameraStatusBadge.textContent = 'LIVE';
    cameraStatusBadge.className = 'badge badge-live';
    
    videoPlaceholder.style.display = 'none';
    videoFeed.style.display = 'block';
    
    videoFeed.src = VIDEO_ENDPOINT;
    previousSignal = "OFFLINE"; // force reset
    
    startStatusPolling();
    fetchHistory(); // get current history on connect
});

// Stop Camera
stopBtn.addEventListener('click', () => {
    isCameraRunning = false;
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    cameraStatusBadge.textContent = 'OFFLINE';
    cameraStatusBadge.className = 'badge badge-offline';
    
    videoFeed.style.display = 'none';
    videoFeed.src = '';
    videoPlaceholder.style.display = 'flex';
    
    stopStatusPolling();
    resetUI();
});

// Polling Logic
function startStatusPolling() {
    if(isAudioActive) audioIconWrapper.classList.add('audio-active');
    
    // Requirement: Poll /signal_status every 500ms
    statusInterval = setInterval(fetchSignalStatus, 500);
}

function stopStatusPolling() {
    clearInterval(statusInterval);
    audioIconWrapper.classList.remove('audio-active');
}

async function fetchSignalStatus() {
    if (!isCameraRunning) return;
    try {
        const response = await fetch(STATUS_ENDPOINT);
        if (response.ok) {
            const data = await response.json();
            const currentSignal = data.color || 'OFFLINE';
            
            // Only update if changed
            if (currentSignal !== previousSignal) {
                updateDashboardUI(data);
                previousSignal = currentSignal;
            }
        }
    } catch (error) {
        console.error("Error fetching signal:", error);
    }
}

// Fetch Backend History Logs
async function fetchHistory() {
    try {
        const response = await fetch(HISTORY_ENDPOINT);
        if (response.ok) {
            const data = await response.json();
            renderHistory(data);
        }
    } catch (error) {
        console.error("Error fetching history:", error);
    }
}

// Update UI elements securely without refresh
function updateDashboardUI(data) {
    const signal = data.color;
    const action = data.action;
    
    // Clear styles
    currentSignalValue.className = 'signal-value';
    actionDisplay.style.color = 'inherit';
    glowLayer.className = 'glow-layer';
    
    if (signal === "RED") {
        currentSignalValue.textContent = "RED";
        currentSignalValue.classList.add('text-red');
        glowLayer.classList.add('glow-red');
        actionDisplay.textContent = action;
        actionDisplay.style.color = "var(--color-red)";
        
        playAudioAlert("Red signal detected, stop vehicles");
        
    } else if (signal === "YELLOW") {
        currentSignalValue.textContent = "YELLOW";
        currentSignalValue.classList.add('text-yellow');
        glowLayer.classList.add('glow-yellow');
        actionDisplay.textContent = action;
        actionDisplay.style.color = "var(--color-yellow)";
        
        playAudioAlert("Yellow signal detected, get ready");
        
    } else if (signal === "GREEN") {
        currentSignalValue.textContent = "GREEN";
        currentSignalValue.classList.add('text-green');
        glowLayer.classList.add('glow-green');
        actionDisplay.textContent = action;
        actionDisplay.style.color = "var(--color-green)";
        
        playAudioAlert("Green signal detected, you may go");
        
    } else {
        currentSignalValue.textContent = signal;
        currentSignalValue.classList.add('text-offline');
        actionDisplay.textContent = "WAITING / NO SIGNAL";
        actionDisplay.style.color = "var(--color-offline)";
    }
    
    // Trigger history refresh
    if (signal !== "NO SIGNAL" && signal !== "OFFLINE") {
        fetchHistory();
    }
}

function resetUI() {
    currentSignalValue.textContent = 'OFFLINE';
    currentSignalValue.className = 'signal-value text-offline';
    actionDisplay.textContent = 'SYSTEM STANDBY';
    actionDisplay.style.color = "var(--text-secondary)";
    glowLayer.className = 'glow-layer';
}

// Audio Alerts
audioToggle.addEventListener('change', (e) => {
    isAudioActive = e.target.checked;
    if (isAudioActive) {
        audioStatusText.textContent = 'Active';
        audioStatusText.style.color = 'var(--accent-color)';
        if (isCameraRunning) audioIconWrapper.classList.add('audio-active');
    } else {
        audioStatusText.textContent = 'Muted';
        audioStatusText.style.color = 'var(--text-secondary)';
        audioIconWrapper.classList.remove('audio-active');
    }
});

function playAudioAlert(text) {
    if (!isAudioActive || !('speechSynthesis' in window)) return;
    
    // Animation burst
    audioIconWrapper.classList.remove('audio-active');
    void audioIconWrapper.offsetWidth;
    audioIconWrapper.classList.add('audio-active');
    
    // Cancel any ongoing speech so it doesn't queue up
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
}

// Render History Panel using fetched API data
function renderHistory(historyData) {
    logContainer.innerHTML = ''; // wipe current logs
    
    if (!historyData || historyData.length === 0) {
        logContainer.innerHTML = `<div class="log-item system"><span class="log-desc">Waiting for telemetry...</span></div>`;
        return;
    }
    
    historyData.forEach(item => {
        const logItem = document.createElement('div');
        logItem.className = `log-item ${item.color.toLowerCase()}`;
        
        logItem.innerHTML = `
            <div class="log-header">
                <span class="log-title title-${item.color.toLowerCase()}">${item.color}</span>
                <span class="log-time">${item.timestamp}</span>
            </div>
            <div class="log-action">ACTION: ${item.action}</div>
        `;
        logContainer.appendChild(logItem);
    });
}

clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = '';
});

// Startup state
resetUI();
