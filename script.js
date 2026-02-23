/* ============================================
   FloFrame — Photobooth Application Logic
   Vanilla JavaScript, no frameworks.
   ============================================ */

// ============================================
// CONFIGURATION
// ============================================

/**
 * List of available templates.
 * Add or remove entries as needed.
 * 'src' should point to the template PNG relative to index.html.
 */
const TEMPLATES = [
  { name: 'Frame 01 (Transparent)', src: 'templates/frame1.png' },
];

const TEMPLATE_TRANSPARENCY_HINTS = {
  'frame1.png': true,
};

/**
 * Slot configuration — coordinates where user photos are placed.
 * All templates share the same layout with 3 vertical photo slots.
 *
 * Adjust x, y, w, h values to match your actual template dimensions.
 * Values are in pixels relative to the template's natural size.
 *
 * TIP: Open the template in an image editor, identify the inner
 * area of each frame (slightly inside the white border), and note
 * the top-left corner (x, y) and the width/height (w, h).
 */
let slotConfig = [
  { x: 72, y: 214, w: 456, h: 288 },  // top slot
  { x: 72, y: 600, w: 456, h: 288 },  // middle slot
  { x: 72, y: 986, w: 456, h: 288 },  // bottom slot
];

const TEMPLATE_SLOT_PRESETS = {
  '2_20260221_214737_0000.png': [
    { x: 109, y: 98, w: 362, h: 385 },
    { x: 109, y: 507, w: 362, h: 355 },
    { x: 109, y: 1228, w: 362, h: 157 },
  ],
  '3_20260221_214737_0001.png': [
    { x: 91, y: 96, w: 415, h: 345 },
    { x: 91, y: 465, w: 415, h: 358 },
    { x: 91, y: 1040, w: 415, h: 261 },
  ],
  '6_20260221_214737_0002.png': [
    { x: 100, y: 218, w: 388, h: 226 },
    { x: 100, y: 644, w: 388, h: 221 },
    { x: 100, y: 1097, w: 388, h: 224 },
  ],
  '7_20260221_214737_0003.png': [
    { x: 40, y: 102, w: 512, h: 388 },
    { x: 40, y: 564, w: 512, h: 390 },
    { x: 40, y: 978, w: 512, h: 402 },
  ],
  '9_20260221_214737_0004.png': [
    { x: 56, y: 175, w: 488, h: 417 },
    { x: 56, y: 616, w: 488, h: 320 },
    { x: 56, y: 1072, w: 488, h: 319 },
  ],
  '11_20260221_214737_0005.png': [
    { x: 71, y: 264, w: 449, h: 247 },
    { x: 71, y: 535, w: 449, h: 349 },
    { x: 71, y: 908, w: 449, h: 385 },
  ],
  '13_20260221_214737_0006.png': [
    { x: 96, y: 200, w: 422, h: 261 },
    { x: 96, y: 772, w: 422, h: 202 },
    { x: 96, y: 1094, w: 422, h: 222 },
  ],
  '15_20260221_214737_0007.png': [
    { x: 38, y: 234, w: 506, h: 269 },
    { x: 38, y: 527, w: 506, h: 300 },
    { x: 38, y: 985, w: 506, h: 293 },
  ],
  '17_20260221_214737_0008.png': [
    { x: 74, y: 200, w: 449, h: 261 },
    { x: 74, y: 620, w: 449, h: 261 },
    { x: 74, y: 1252, w: 449, h: 167 },
  ],
  '19_20260221_214737_0009.png': [
    { x: 43, y: 188, w: 505, h: 386 },
    { x: 43, y: 598, w: 505, h: 270 },
    { x: 43, y: 892, w: 505, h: 379 },
  ],
};

const SLOT_CONFIG_STORAGE_KEY = 'floframe-slot-config-v1';

/**
 * WhatsApp target phone number (with country code, no + sign).
 * Example: '6281234567890' for Indonesia +62-812-3456-7890
 */
const WA_PHONE_NUMBER = '6281234567890';

/**
 * Number of photos to capture.
 */
const TOTAL_PHOTOS = 3;

/**
 * Countdown duration (seconds) before each capture.
 */
const COUNTDOWN_SECONDS = 3;


// ============================================
// STATE
// ============================================

let selectedTemplate = null;   // { name, src, resolvedSrc? }
let cameraStream = null;       // MediaStream
let capturedPhotos = [];       // Array of HTMLImageElement (data URLs)
let zoomValues = [1, 1, 1];   // Scale value for each photo slot
let templateImageCache = null;
const templateTransparencyCache = {};
let slotConfigDetected = false;
const slotConfigCacheByTemplate = {};
let slotConfigStorage = loadSlotConfigStorage();
let isClickCalibrating = false;
let clickCalibrationStep = 0;
let clickStartPoint = null;


// ============================================
// DOM REFERENCES
// ============================================

const $landing          = document.getElementById('landing');
const $templateSection  = document.getElementById('templateSelection');
const $photobooth       = document.getElementById('photobooth');
const $adjustSection    = document.getElementById('adjustSection');
const $resultSection    = document.getElementById('resultSection');

const $btnStart         = document.getElementById('btnStart');
const $templateGrid     = document.getElementById('templateGrid');
const $cameraFeed       = document.getElementById('cameraFeed');
const $countdown        = document.getElementById('countdown');
const $flash            = document.getElementById('flash');
const $captureStatus    = document.getElementById('captureStatus');
const $btnCapture       = document.getElementById('btnCapture');
const $btnProceed       = document.getElementById('btnProceed');
const $adjustCards      = document.getElementById('adjustCards');
const $calibrationControls = document.getElementById('calibrationControls');
const $btnCalibrateClick = document.getElementById('btnCalibrateClick');
const $btnResetTemplateSlot = document.getElementById('btnResetTemplateSlot');
const $btnCopySlotConfig = document.getElementById('btnCopySlotConfig');
const $calibrationHint = document.getElementById('calibrationHint');
const $adjustPreviewCanvas = document.getElementById('adjustPreviewCanvas');
const $btnGenerate      = document.getElementById('btnGenerate');
const $resultCanvas     = document.getElementById('resultCanvas');
const $userName         = document.getElementById('userName');
const $btnDownload      = document.getElementById('btnDownload');
const $btnWhatsApp      = document.getElementById('btnWhatsApp');
const $btnRestart       = document.getElementById('btnRestart');
const $captureCanvas    = document.getElementById('captureCanvas');


// ============================================
// SECTION NAVIGATION
// ============================================

/**
 * Show a specific section and hide all others.
 * @param {HTMLElement} section - The section element to show.
 */
function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  section.classList.add('active');
  // Scroll to top of the page when switching sections
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getTemplateFileName() {
  const src = selectedTemplate?.src || '';
  const parts = src.split('/');
  return parts[parts.length - 1] || '';
}

function loadSlotConfigStorage() {
  try {
    const raw = localStorage.getItem(SLOT_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSlotConfigStorage() {
  localStorage.setItem(SLOT_CONFIG_STORAGE_KEY, JSON.stringify(slotConfigStorage));
}

function saveCurrentSlotConfigForTemplate() {
  const key = getTemplateFileName();
  if (!key) return;
  slotConfigStorage[key] = slotConfig.map((slot) => ({ ...slot }));
  saveSlotConfigStorage();
  slotConfigCacheByTemplate[key] = slotConfig.map((slot) => ({ ...slot }));
}


// ============================================
// SECTION 1: LANDING
// ============================================

$btnStart.addEventListener('click', () => {
  showSection($templateSection);
  renderTemplates();
});


// ============================================
// SECTION 2: TEMPLATE SELECTION
// ============================================

/**
 * Render template cards into the grid.
 */
function renderTemplates() {
  $templateGrid.innerHTML = '';

  TEMPLATES.forEach((tmpl, index) => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `
      <img src="${tmpl.src}" alt="${tmpl.name}" />
      <div class="template-label">${tmpl.name}</div>
    `;

    card.addEventListener('click', () => {
      // Mark selected
      document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      // Keep both original relative path and browser-resolved absolute URL.
      // This helps avoid path issues when generating final canvas.
      const previewImg = card.querySelector('img');
      selectedTemplate = {
        ...tmpl,
        resolvedSrc: tmpl.src,
      };
      templateImageCache = null;
      slotConfigDetected = false;

      // Auto-proceed to photobooth after short delay
      setTimeout(() => {
        showSection($photobooth);
        initCamera();
      }, 400);
    });

    $templateGrid.appendChild(card);
  });
}


// ============================================
// SECTION 3: PHOTOBOOTH — CAMERA
// ============================================

/**
 * Initialize camera using getUserMedia.
 * Requests rear-facing camera on mobile, any camera on desktop.
 */
async function initCamera() {
  try {
    // Reset state for new session
    capturedPhotos = [];
    zoomValues = [1, 1, 1];
    resetPreviewSlots();
    $btnCapture.disabled = false;
    $btnCapture.textContent = 'Start Capture';
    $btnProceed.classList.add('hidden');
    $captureStatus.textContent = 'Press the button to start capturing 3 photos.';

    // Request camera access
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });

    $cameraFeed.srcObject = cameraStream;
    await $cameraFeed.play();
  } catch (err) {
    console.error('Camera access error:', err);
    $captureStatus.textContent = 'Camera access denied. Please allow camera permission and refresh.';
    $btnCapture.disabled = true;
  }
}

/**
 * Stop the active camera stream.
 */
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    $cameraFeed.srcObject = null;
  }
}

/**
 * Reset preview slot thumbnails.
 */
function resetPreviewSlots() {
  for (let i = 0; i < TOTAL_PHOTOS; i++) {
    const slot = document.getElementById(`prev${i}`);
    slot.classList.remove('filled');
    slot.innerHTML = `<span>${i + 1}</span>`;
  }
}


// ============================================
// SECTION 3: PHOTOBOOTH — CAPTURE FLOW
// ============================================

$btnCapture.addEventListener('click', () => {
  startCapture();
});

/**
 * Begin the sequential capture of 3 photos with countdown.
 */
async function startCapture() {
  if (!selectedTemplate) {
    $captureStatus.textContent = 'Please select a template first.';
    return;
  }

  // If camera was stopped (e.g. after previous capture), re-initialize first.
  if (!cameraStream || !$cameraFeed.srcObject) {
    await initCamera();
  }

  if (!$cameraFeed.srcObject) {
    $captureStatus.textContent = 'Camera is not ready. Please allow camera permission.';
    return;
  }

  await waitForVideoReady();

  $btnCapture.disabled = true;
  $btnCapture.textContent = 'Capturing...';
  capturedPhotos = [];
  resetPreviewSlots();

  for (let i = 0; i < TOTAL_PHOTOS; i++) {
    $captureStatus.textContent = `Get ready for photo ${i + 1} of ${TOTAL_PHOTOS}...`;

    // Countdown
    await showCountdown(COUNTDOWN_SECONDS);

    // Capture
    const photoDataUrl = capturePhoto();
    capturedPhotos.push(photoDataUrl);

    // Flash effect
    triggerFlash();

    // Update preview
    updatePreviewSlot(i, photoDataUrl);

    $captureStatus.textContent = `Photo ${i + 1} captured!`;

    // Brief pause between captures
    if (i < TOTAL_PHOTOS - 1) {
      await delay(800);
    }
  }

  // All photos captured
  $captureStatus.textContent = 'All photos captured! You can proceed.';
  $btnCapture.textContent = 'Retake Photos';
  $btnCapture.disabled = false;
  $btnProceed.classList.remove('hidden');

  // Stop camera to free resources
  stopCamera();
}

/**
 * Display countdown numbers (3, 2, 1) with a 1-second interval.
 * @param {number} seconds - Duration of countdown.
 */
function showCountdown(seconds) {
  return new Promise(resolve => {
    let remaining = seconds;
    $countdown.classList.remove('hidden');
    $countdown.textContent = remaining;

    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        $countdown.textContent = remaining;
      } else {
        clearInterval(interval);
        $countdown.classList.add('hidden');
        resolve();
      }
    }, 1000);
  });
}

/**
 * Capture a single frame from the camera feed.
 * The image is captured at the video's native resolution.
 * The canvas draws the video mirrored (matching the preview).
 * @returns {string} Data URL of the captured photo.
 */
function capturePhoto() {
  const vw = $cameraFeed.videoWidth;
  const vh = $cameraFeed.videoHeight;

  if (!vw || !vh) {
    throw new Error('Camera frame is not ready yet.');
  }

  $captureCanvas.width = vw;
  $captureCanvas.height = vh;

  const ctx = $captureCanvas.getContext('2d');

  // Draw mirrored to match the live preview
  ctx.save();
  ctx.translate(vw, 0);
  ctx.scale(-1, 1);
  ctx.drawImage($cameraFeed, 0, 0, vw, vh);
  ctx.restore();

  return $captureCanvas.toDataURL('image/png');
}

/**
 * Show a brief white flash overlay to simulate a camera flash.
 */
function triggerFlash() {
  $flash.classList.remove('hidden');
  // Remove after animation completes
  setTimeout(() => $flash.classList.add('hidden'), 350);
}

/**
 * Update a preview slot with a captured photo thumbnail.
 * @param {number} index - Slot index (0–2).
 * @param {string} dataUrl - Photo data URL.
 */
function updatePreviewSlot(index, dataUrl) {
  const slot = document.getElementById(`prev${index}`);
  slot.innerHTML = `<img src="${dataUrl}" alt="Photo ${index + 1}" />`;
  slot.classList.add('filled');
}

/**
 * Simple delay helper.
 * @param {number} ms - Milliseconds.
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait until video has valid dimensions and can be captured.
 */
function waitForVideoReady() {
  if ($cameraFeed.readyState >= 2 && $cameraFeed.videoWidth > 0 && $cameraFeed.videoHeight > 0) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const onLoaded = () => {
      $cameraFeed.removeEventListener('loadeddata', onLoaded);
      resolve();
    };
    $cameraFeed.addEventListener('loadeddata', onLoaded, { once: true });
  });
}


// ============================================
// RETAKE handling
// ============================================

// When recapturing is needed after camera was stopped
$btnProceed.addEventListener('click', async () => {
  if (capturedPhotos.length !== TOTAL_PHOTOS) {
    $captureStatus.textContent = 'Please capture 3 photos first.';
    showSection($photobooth);
    return;
  }

  showSection($adjustSection);
  await renderAdjustCards();
});


// ============================================
// SECTION 4: PHOTO ADJUSTMENT
// ============================================

/**
 * Render adjustment cards for each captured photo.
 * Each card contains a thumbnail and a zoom slider.
 */
async function renderAdjustCards() {
  $adjustCards.innerHTML = '';

  capturedPhotos.forEach((dataUrl, i) => {
    const card = document.createElement('div');
    card.className = 'adjust-card';
    card.innerHTML = `
      <div class="thumb-wrapper">
        <img src="${dataUrl}" alt="Photo ${i + 1}" />
      </div>
      <div>
        <label>Photo ${i + 1} — Zoom</label>
        <input
          type="range"
          min="1"
          max="2"
          step="0.05"
          value="${zoomValues[i]}"
          data-index="${i}"
          class="zoom-slider"
        />
        <div class="zoom-value" id="zoomVal${i}">${zoomValues[i].toFixed(2)}x</div>
      </div>
    `;

    // Listen for slider changes
    const slider = card.querySelector('.zoom-slider');
    const thumbImg = card.querySelector('.thumb-wrapper img');

    slider.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      zoomValues[idx] = parseFloat(e.target.value);
      document.getElementById(`zoomVal${idx}`).textContent = zoomValues[idx].toFixed(2) + 'x';

      // Visual feedback in adjustment preview
      thumbImg.style.transform = `scale(${zoomValues[idx]})`;
      thumbImg.style.transformOrigin = 'center center';
      renderAdjustPreview();
    });

    // Apply initial preview scale
    thumbImg.style.transform = `scale(${zoomValues[i]})`;
    thumbImg.style.transformOrigin = 'center center';

    $adjustCards.appendChild(card);
  });

  await prepareCalibrationDefaults();
  renderCalibrationControls();
  updateCalibrationHint();
  await renderAdjustPreview();
}

/**
 * Load selected template once and reuse it for preview/generate.
 */
async function ensureTemplateImage() {
  if (templateImageCache) return templateImageCache;
  const templateSrc = selectedTemplate?.src;
  templateImageCache = await loadImage(templateSrc);
  return templateImageCache;
}

/**
 * Detect whether a template contains alpha transparency.
 * This determines the drawing order:
 * - transparent template => photos first, template overlay on top
 * - opaque template      => template first, photos above it
 */
function hasTemplateTransparency(templateImg, cacheKey) {
  if (cacheKey && typeof TEMPLATE_TRANSPARENCY_HINTS[cacheKey] === 'boolean') {
    const hinted = TEMPLATE_TRANSPARENCY_HINTS[cacheKey];
    templateTransparencyCache[cacheKey] = hinted;
    return hinted;
  }

  if (cacheKey && typeof templateTransparencyCache[cacheKey] === 'boolean') {
    return templateTransparencyCache[cacheKey];
  }

  const w = templateImg.naturalWidth;
  const h = templateImg.naturalHeight;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const offCtx = off.getContext('2d', { willReadFrequently: true });
  offCtx.drawImage(templateImg, 0, 0, w, h);

  let data;
  try {
    data = offCtx.getImageData(0, 0, w, h).data;
  } catch (error) {
    console.warn('Transparency detection skipped due to canvas security restriction:', error);
    const fallback = true;
    if (cacheKey) {
      templateTransparencyCache[cacheKey] = fallback;
    }
    return fallback;
  }
  let transparent = false;

  // Scan alpha channel only (RGBA => every 4th, index 3)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      transparent = true;
      break;
    }
  }

  if (cacheKey) {
    templateTransparencyCache[cacheKey] = transparent;
  }

  return transparent;
}

async function drawPhotosOnSlots(ctx, photos, slots, zooms) {
  for (let i = 0; i < TOTAL_PHOTOS; i++) {
    const photo = await loadImage(photos[i]);
    drawCenterCrop(ctx, photo, slots[i], zooms[i]);
  }
}

async function drawCompositeWithTemplateMode(ctx, templateImg, photos, slots, zooms, cw, ch, templateKey) {
  const isTransparentTemplate = hasTemplateTransparency(templateImg, templateKey);

  if (isTransparentTemplate) {
    await drawPhotosOnSlots(ctx, photos, slots, zooms);
    ctx.drawImage(templateImg, 0, 0, cw, ch);
  } else {
    ctx.drawImage(templateImg, 0, 0, cw, ch);
    await drawPhotosOnSlots(ctx, photos, slots, zooms);
  }
}

/**
 * Auto-set better default slot values when still using initial placeholder config.
 */
async function prepareCalibrationDefaults() {
  const templateImg = await ensureTemplateImage();
  const templateKey = getTemplateFileName();

  if (!slotConfigDetected && slotConfigCacheByTemplate[templateKey]) {
    slotConfig = slotConfigCacheByTemplate[templateKey].map((slot) => ({ ...slot }));
    normalizeSlotConfig(templateImg.naturalWidth, templateImg.naturalHeight);
    slotConfigDetected = true;
    return;
  }

  if (!slotConfigDetected) {
    if (slotConfigStorage[templateKey]) {
      slotConfig = slotConfigStorage[templateKey].map((slot) => ({ ...slot }));
    } else if (TEMPLATE_SLOT_PRESETS[templateKey]) {
      slotConfig = TEMPLATE_SLOT_PRESETS[templateKey].map((slot) => ({ ...slot }));
    } else {
      slotConfig = buildFallbackSlotConfig(templateImg.naturalWidth, templateImg.naturalHeight);
    }

    normalizeSlotConfig(templateImg.naturalWidth, templateImg.naturalHeight);
    slotConfigCacheByTemplate[templateKey] = slotConfig.map((slot) => ({ ...slot }));
    slotConfigDetected = true;
    return;
  }

  const isOldPlaceholderConfig =
    slotConfig[0].x === 50 &&
    slotConfig[0].y === 50 &&
    slotConfig[0].w === 500 &&
    slotConfig[0].h === 370;

  if (isOldPlaceholderConfig) {
    const tw = templateImg.naturalWidth;
    const th = templateImg.naturalHeight;

    const slotW = Math.round(tw * 0.76);
    const slotH = Math.round(th * 0.19);
    const gap = Math.round(th * 0.07);
    const x = Math.round((tw - slotW) / 2);
    const y0 = Math.round((th - (slotH * 3 + gap * 2)) / 2);

    slotConfig = [
      { x, y: y0, w: slotW, h: slotH },
      { x, y: y0 + slotH + gap, w: slotW, h: slotH },
      { x, y: y0 + (slotH + gap) * 2, w: slotW, h: slotH },
    ];
  }

  normalizeSlotConfig(templateImg.naturalWidth, templateImg.naturalHeight);
}

/**
 * Build fallback slot config by ratio when auto detection is not reliable.
 */
function buildFallbackSlotConfig(templateW, templateH) {
  const slotW = Math.round(templateW * 0.76);
  const slotH = Math.round(templateH * 0.19);
  const gap = Math.round(templateH * 0.07);
  const x = Math.round((templateW - slotW) / 2);
  const y0 = Math.round((templateH - (slotH * 3 + gap * 2)) / 2);

  return [
    { x, y: y0, w: slotW, h: slotH },
    { x, y: y0 + slotH + gap, w: slotW, h: slotH },
    { x, y: y0 + (slotH + gap) * 2, w: slotW, h: slotH },
  ];
}

/**
 * Keep slot config values inside template bounds.
 */
function normalizeSlotConfig(templateW, templateH) {
  slotConfig = slotConfig.map((slot) => {
    const safeW = Math.max(20, Math.min(Math.round(slot.w), templateW));
    const safeH = Math.max(20, Math.min(Math.round(slot.h), templateH));
    const safeX = Math.max(0, Math.min(Math.round(slot.x), templateW - safeW));
    const safeY = Math.max(0, Math.min(Math.round(slot.y), templateH - safeH));
    return { x: safeX, y: safeY, w: safeW, h: safeH };
  });
}

/**
 * Render sliders to calibrate each slot independently (x/y/w/h).
 */
function renderCalibrationControls() {
  if (!$calibrationControls) return;

  const templateW = templateImageCache?.naturalWidth || 600;
  const templateH = templateImageCache?.naturalHeight || 1500;

  const fields = [
    { key: 'x', label: 'X', min: 0, max: templateW, step: 1 },
    { key: 'y', label: 'Y', min: 0, max: templateH, step: 1 },
    { key: 'w', label: 'Width', min: 20, max: templateW, step: 1 },
    { key: 'h', label: 'Height', min: 20, max: templateH, step: 1 },
  ];

  $calibrationControls.innerHTML = '';

  slotConfig.forEach((slot, slotIndex) => {
    fields.forEach((field) => {
      const wrap = document.createElement('div');
      wrap.className = 'cal-item';
      wrap.innerHTML = `
        <label>Slot ${slotIndex + 1} — ${field.label}</label>
        <input
          type="range"
          min="${field.min}"
          max="${field.max}"
          step="${field.step}"
          value="${slot[field.key]}"
          data-slot="${slotIndex}"
          data-key="${field.key}"
        />
        <div class="cal-val" id="calVal-${slotIndex}-${field.key}">${Math.round(slot[field.key])} px</div>
      `;

      const input = wrap.querySelector('input');
      input.addEventListener('input', async (event) => {
        const idx = parseInt(event.target.dataset.slot, 10);
        const key = event.target.dataset.key;
        slotConfig[idx][key] = parseFloat(event.target.value);
        normalizeSlotConfig(templateW, templateH);
        document.getElementById(`calVal-${idx}-${key}`).textContent = `${Math.round(slotConfig[idx][key])} px`;
        saveCurrentSlotConfigForTemplate();
        await renderAdjustPreview();
      });

      $calibrationControls.appendChild(wrap);
    });
  });
}

function updateCalibrationHint() {
  if (!$calibrationHint) return;

  if (!isClickCalibrating) {
    $calibrationHint.textContent = 'Tip: klik "Calibrate by Click" lalu tandai kiri-atas dan kanan-bawah untuk tiap slot.';
    return;
  }

  const slotIndex = Math.floor(clickCalibrationStep / 2) + 1;
  const pointLabel = clickCalibrationStep % 2 === 0 ? 'kiri-atas' : 'kanan-bawah';
  $calibrationHint.textContent = `Mode klik aktif: pilih titik ${pointLabel} untuk Slot ${slotIndex}.`;
}

function startClickCalibration() {
  isClickCalibrating = true;
  clickCalibrationStep = 0;
  clickStartPoint = null;
  updateCalibrationHint();
}

function stopClickCalibration() {
  isClickCalibrating = false;
  clickCalibrationStep = 0;
  clickStartPoint = null;
  updateCalibrationHint();
}

if ($btnCalibrateClick) {
  $btnCalibrateClick.addEventListener('click', () => {
    startClickCalibration();
  });
}

if ($btnResetTemplateSlot) {
  $btnResetTemplateSlot.addEventListener('click', async () => {
    const key = getTemplateFileName();
    if (!key) return;

    delete slotConfigStorage[key];
    saveSlotConfigStorage();

    if (TEMPLATE_SLOT_PRESETS[key]) {
      slotConfig = TEMPLATE_SLOT_PRESETS[key].map((slot) => ({ ...slot }));
    } else if (templateImageCache) {
      slotConfig = buildFallbackSlotConfig(templateImageCache.naturalWidth, templateImageCache.naturalHeight);
    }

    normalizeSlotConfig(templateImageCache?.naturalWidth || 600, templateImageCache?.naturalHeight || 1500);
    renderCalibrationControls();
    await renderAdjustPreview();
    stopClickCalibration();
  });
}

if ($btnCopySlotConfig) {
  $btnCopySlotConfig.addEventListener('click', async () => {
    const json = `const slotConfig = ${JSON.stringify(slotConfig, null, 2)};`;

    try {
      await navigator.clipboard.writeText(json);
      alert('slotConfig berhasil dicopy.');
    } catch {
      alert('Gagal copy otomatis. Cek console untuk slotConfig.');
      console.log(json);
    }
  });
}

/**
 * Live preview in adjust section using current slot calibration + zoom values.
 */
async function renderAdjustPreview() {
  if (!$adjustPreviewCanvas || capturedPhotos.length !== TOTAL_PHOTOS || !selectedTemplate) {
    return;
  }

  const templateImg = await ensureTemplateImage();
  const pw = templateImg.naturalWidth;
  const ph = templateImg.naturalHeight;
  $adjustPreviewCanvas.width = pw;
  $adjustPreviewCanvas.height = ph;

  const ctx = $adjustPreviewCanvas.getContext('2d');
  ctx.clearRect(0, 0, pw, ph);

  const templateKey = getTemplateFileName();
  await drawCompositeWithTemplateMode(
    ctx,
    templateImg,
    capturedPhotos,
    slotConfig,
    zoomValues,
    pw,
    ph,
    templateKey
  );

  // Guide overlay to make slot calibration easier.
  ctx.save();
  ctx.lineWidth = Math.max(2, Math.round(pw * 0.004));
  slotConfig.forEach((slot, idx) => {
    ctx.strokeStyle = '#ffcc00';
    ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(slot.x, Math.max(0, slot.y - 28), 74, 24);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(12, Math.round(pw * 0.025))}px sans-serif`;
    ctx.fillText(`Slot ${idx + 1}`, slot.x + 8, Math.max(16, slot.y - 10));
  });
  ctx.restore();
}

if ($adjustPreviewCanvas) {
  $adjustPreviewCanvas.addEventListener('click', async (event) => {
    if (!isClickCalibrating || !templateImageCache) return;

    const rect = $adjustPreviewCanvas.getBoundingClientRect();
    const scaleX = $adjustPreviewCanvas.width / rect.width;
    const scaleY = $adjustPreviewCanvas.height / rect.height;
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);

    const currentSlotIndex = Math.floor(clickCalibrationStep / 2);
    if (currentSlotIndex >= TOTAL_PHOTOS) {
      stopClickCalibration();
      return;
    }

    if (clickCalibrationStep % 2 === 0) {
      clickStartPoint = { x, y };
      slotConfig[currentSlotIndex].x = x;
      slotConfig[currentSlotIndex].y = y;
    } else {
      const start = clickStartPoint || { x, y };
      const left = Math.min(start.x, x);
      const top = Math.min(start.y, y);
      const width = Math.max(20, Math.abs(x - start.x));
      const height = Math.max(20, Math.abs(y - start.y));
      slotConfig[currentSlotIndex] = { x: left, y: top, w: width, h: height };
      clickStartPoint = null;
    }

    normalizeSlotConfig(templateImageCache.naturalWidth, templateImageCache.naturalHeight);
    renderCalibrationControls();
    saveCurrentSlotConfigForTemplate();

    clickCalibrationStep++;
    if (clickCalibrationStep >= TOTAL_PHOTOS * 2) {
      stopClickCalibration();
      alert('Kalibrasi klik selesai dan tersimpan untuk template ini.');
    } else {
      updateCalibrationHint();
    }

    await renderAdjustPreview();
  });
}


// ============================================
// SECTION 5: GENERATE PHOTOSTRIP
// ============================================

$btnGenerate.addEventListener('click', async () => {
  try {
    if (!selectedTemplate) {
      alert('Template belum dipilih. Silakan pilih template dulu.');
      showSection($templateSection);
      return;
    }

    if (capturedPhotos.length !== TOTAL_PHOTOS) {
      alert('Foto belum lengkap. Silakan ambil 3 foto dulu.');
      showSection($photobooth);
      return;
    }

    $btnGenerate.disabled = true;
    $btnGenerate.textContent = 'Generating...';

    await generatePhotostrip();
    showSection($resultSection);
  } catch (error) {
    console.error('Generate photostrip error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    alert(`Gagal generate photostrip: ${detail}`);
  } finally {
    $btnGenerate.disabled = false;
    $btnGenerate.textContent = 'Generate Photostrip';
  }
});

/**
 * Generate the final photostrip by compositing user photos
 * onto the selected template.
 *
 * Steps:
 *  1. Load the template image.
 *  2. Set canvas size to template's natural dimensions.
 *  3. Draw the template onto the canvas.
 *  4. For each slot, draw the user photo using center-crop
 *     technique with the zoom scale applied.
 */
async function generatePhotostrip() {
  if (!selectedTemplate) {
    throw new Error('No template selected.');
  }

  if (slotConfig.length !== TOTAL_PHOTOS) {
    throw new Error('slotConfig must contain exactly 3 slots.');
  }

  // Load template image
  const templateSrc = selectedTemplate.src;
  const templateImg = await loadImage(templateSrc);

  // Set canvas dimensions to match template exactly
  const cw = templateImg.naturalWidth;
  const ch = templateImg.naturalHeight;
  $resultCanvas.width = cw;
  $resultCanvas.height = ch;

  const ctx = $resultCanvas.getContext('2d');

  const templateKey = getTemplateFileName();
  await drawCompositeWithTemplateMode(
    ctx,
    templateImg,
    capturedPhotos,
    slotConfig,
    zoomValues,
    cw,
    ch,
    templateKey
  );
}

/**
 * Draw an image into a rectangular slot using center-crop technique.
 * The image is scaled to cover the slot, then centered.
 * An additional zoom factor can enlarge the visible area.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context.
 * @param {HTMLImageElement} img - Source image.
 * @param {Object} slot - { x, y, w, h } destination on canvas.
 * @param {number} scale - Zoom factor (1 = default cover).
 */
function drawCenterCrop(ctx, img, slot, scale) {
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const slotAspect = slot.w / slot.h;
  const imgAspect = imgW / imgH;

  let srcX, srcY, srcW, srcH;

  if (imgAspect > slotAspect) {
    // Image is wider than slot — crop sides
    srcH = imgH / scale;
    srcW = srcH * slotAspect;
  } else {
    // Image is taller than slot — crop top/bottom
    srcW = imgW / scale;
    srcH = srcW / slotAspect;
  }

  // Center the crop region
  srcX = (imgW - srcW) / 2;
  srcY = (imgH - srcH) / 2;

  // Draw cropped image into slot area
  ctx.drawImage(
    img,
    srcX, srcY, srcW, srcH,    // source crop
    slot.x, slot.y, slot.w, slot.h  // destination on canvas
  );
}

/**
 * Load an image from a URL and return a Promise.
 * @param {string} src - Image URL or data URL.
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Image source is empty.'));
      return;
    }

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

    img.src = src;
  });
}


// ============================================
// DOWNLOAD & WHATSAPP
// ============================================

/**
 * Download the generated photostrip as a PNG file.
 */
$btnDownload.addEventListener('click', () => {
  downloadImage();
});

function downloadImage() {
  if (!$resultCanvas.width || !$resultCanvas.height) {
    alert('Belum ada hasil photostrip. Silakan generate dulu.');
    return;
  }

  const triggerDownload = (href) => {
    const link = document.createElement('a');
    link.download = 'photostrip.png';
    link.href = href;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  try {
    const dataUrl = $resultCanvas.toDataURL('image/png');
    triggerDownload(dataUrl);
    return;
  } catch (error) {
    console.warn('toDataURL failed, trying toBlob fallback:', error);
  }

  $resultCanvas.toBlob((blob) => {
    if (!blob) {
      alert('Download gagal karena canvas diblokir browser (cross-origin). Jalankan project via server lokal (http://localhost) dan pastikan template dari folder lokal.');
      return;
    }

    const url = URL.createObjectURL(blob);
    triggerDownload(url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

/**
 * Open WhatsApp with a pre-filled text message.
 * The image cannot be sent automatically on static hosting,
 * so the user is instructed to send it manually.
 */
$btnWhatsApp.addEventListener('click', () => {
  sendToWhatsApp();
});

function sendToWhatsApp() {
  const name = $userName.value.trim() || 'Guest';
  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const templateName = selectedTemplate ? selectedTemplate.name : 'Unknown';

  const message =
`Hello, I would like to order a photostrip.

Name: ${name}
Date: ${date}
Template: ${templateName}

I have downloaded the image and will send it here.`;

  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${WA_PHONE_NUMBER}?text=${encoded}`;
  window.open(url, '_blank');
}


// ============================================
// RESTART
// ============================================

$btnRestart.addEventListener('click', () => {
  // Reset all state
  selectedTemplate = null;
  cameraStream = null;
  capturedPhotos = [];
  zoomValues = [1, 1, 1];
  $userName.value = '';

  // Clear canvas
  const ctx = $resultCanvas.getContext('2d');
  ctx.clearRect(0, 0, $resultCanvas.width, $resultCanvas.height);

  // Go back to landing
  showSection($landing);
});
