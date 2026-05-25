const API = 'https://gitscan-production.up.railway.app';
const BASE = 'https://gitscan.up.railway.app';

const SEV_COLOR = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#888',
};

const STAGES = ['queued', 'cloning', 'scanning', 'analyzing'];
const STAGE_LABEL = { queued: 'QUEUED', cloning: 'CLONING', scanning: 'SCANNING', analyzing: 'ANALYZING' };

let currentJobId = null;
let pollInterval = null;
let shownLogs = 0;
let lastReport = null;
let lastRepoUrl = null;

// ── Elements ─────────────────────────────────────────────────────────────────
const detectedBar  = document.getElementById('detected-bar');
const detectedUrlEl = document.getElementById('detected-url');
const urlInput     = document.getElementById('url-input');
const toggleBtn    = document.getElementById('toggle-input');
const scanBtn      = document.getElementById('scan-btn');
const statusEl     = document.getElementById('status');
const stagesEl     = document.getElementById('stages');
const logBox       = document.getElementById('log-box');
const termTitle    = document.getElementById('term-title');
const resultEl     = document.getElementById('result');
const errorBox     = document.getElementById('error-box');
const noRepo       = document.getElementById('no-repo');
const scoreCircle  = document.getElementById('score-circle');
const scoreNum     = document.getElementById('score-num');
const severityBadge = document.getElementById('severity-badge');
const summaryText  = document.getElementById('summary-text');
const recsEl       = document.getElementById('recs');
const recsListEl   = document.getElementById('recs-list');
const reportBtn        = document.getElementById('report-btn');
const cardBtn          = document.getElementById('card-btn');
const rescanBtn        = document.getElementById('rescan-btn');
const cardOverlay      = document.getElementById('card-overlay');
const cardPreviewImg   = document.getElementById('card-preview-img');
const cardDownloadBtn  = document.getElementById('card-download-btn');
const cardTweetBtn     = document.getElementById('card-tweet-btn');
const cardOverlayClose = document.getElementById('card-overlay-close');

// ── Pixel art characters ──────────────────────────────────────────────────────
// 0=transparent, 1=severity color, 2=white, 3=dim
const PIXEL_CHARS = {
  clean: [  // SAFE-BOT: shield guardian with happy face
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,2,0,0,2,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,0,1,1,0,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,3,1,1,3,0,0],
    [0,1,1,1,1,1,1,0],
    [0,1,3,0,0,3,1,0],
    [1,1,0,0,0,0,1,1],
    [1,0,0,0,0,0,0,1],
  ],
  low: [  // SLEUTH: detective with hat
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,1,2,0,0,2,1,0],
    [0,1,0,0,0,0,1,0],
    [0,1,1,0,0,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,3,1,1,3,0,0],
    [0,1,1,1,1,1,1,0],
    [0,1,0,3,3,0,1,0],
    [1,1,0,0,0,0,1,1],
    [1,0,0,1,1,0,0,1],
  ],
  medium: [  // GLITCH: robot with glitch effect
    [1,0,1,1,1,1,0,1],
    [0,1,1,1,1,1,1,0],
    [0,1,2,1,0,2,1,0],
    [0,1,1,1,0,1,1,0],
    [0,1,0,1,1,0,1,0],
    [0,1,1,1,1,1,1,0],
    [1,0,1,1,1,1,0,1],
    [0,0,3,1,1,3,0,0],
    [1,1,1,1,1,1,1,1],
    [1,0,3,0,0,3,0,1],
    [1,1,0,0,0,0,1,1],
    [0,1,1,0,0,1,1,0],
  ],
  high: [  // BUGXOR: menacing bug
    [1,0,0,1,1,0,0,1],
    [0,1,1,1,1,1,1,0],
    [1,1,2,1,1,2,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,1,0,0,1,1,1],
    [0,1,1,1,1,1,1,0],
    [1,0,1,1,1,1,0,1],
    [0,1,0,0,0,0,1,0],
    [1,0,1,0,0,1,0,1],
    [0,1,0,0,0,0,1,0],
    [1,0,1,0,0,1,0,1],
    [0,0,0,0,0,0,0,0],
  ],
  critical: [  // SKULL-0: skull
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,0,2,1,1,2,0,1],
    [1,0,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,1,0,1,1,0,1,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  unknown: [  // UNIT-?: question mark bot
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,0,2,2,0,1,1],
    [1,1,0,0,0,0,1,1],
    [0,0,0,1,1,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
};

const CHAR_LABELS = {
  clean: 'SAFE-BOT', low: 'SLEUTH', medium: 'GL1TCH',
  high: 'BUGXOR', critical: 'SKULL-0', unknown: 'UNIT-?',
};

// ── Card generator ────────────────────────────────────────────────────────────
function generateShareCard(report, repoUrl, jobId) {
  const W = 360, H = 500;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const sev = report.severity || 'unknown';
  const color = SEV_COLOR[sev] || '#888';
  const score = report.risk_score ?? '?';

  // Background
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 24) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 24) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Colored edge glow strip (left)
  const grad = ctx.createLinearGradient(0, 0, 6, 0);
  grad.addColorStop(0, color + 'cc');
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 6, H);

  // Outer border
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, W-28, H-28);

  // Corner brackets
  const bl = 18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  [[14,14,1,1],[W-14,14,-1,1],[14,H-14,1,-1],[W-14,H-14,-1,-1]].forEach(([x,y,dx,dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y+dy*bl); ctx.lineTo(x, y); ctx.lineTo(x+dx*bl, y); ctx.stroke();
  });

  // Header row
  ctx.font = '600 10px "Courier New", monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('GITSCAN', 26, 34);
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillText('SECURITY SCAN REPORT', 26, 48);

  const scanId = jobId ? '#' + jobId.slice(0,6).toUpperCase() : '#------';
  ctx.textAlign = 'right';
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText(scanId, W-26, 34);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(26, 58); ctx.lineTo(W-26, 58); ctx.stroke();

  // ── Pixel art character ──
  const pixels = PIXEL_CHARS[sev] || PIXEL_CHARS['unknown'];
  const PS = 11; // pixel size
  const charW = pixels[0].length * PS;
  const charH = pixels.length * PS;
  const charX = Math.floor((W - charW) / 2);
  const charY = 70;

  // Glow behind character
  ctx.shadowColor = color;
  ctx.shadowBlur = 40;
  ctx.fillStyle = color + '08';
  ctx.fillRect(charX - 10, charY - 10, charW + 20, charH + 20);
  ctx.shadowBlur = 0;

  pixels.forEach((row, r) => {
    row.forEach((px, c) => {
      if (!px) return;
      const x = charX + c * PS, y = charY + r * PS;
      ctx.fillStyle = px === 1 ? color : px === 2 ? '#ffffff' : 'rgba(255,255,255,0.12)';
      if (px === 1) { ctx.shadowColor = color; ctx.shadowBlur = 6; }
      ctx.fillRect(x, y, PS - 1, PS - 1);
      ctx.shadowBlur = 0;
    });
  });

  // Character name
  const charLabel = CHAR_LABELS[sev] || 'UNIT-?';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 10;
  ctx.fillText(charLabel, W/2, charY + charH + 18);
  ctx.shadowBlur = 0;

  // Divider
  const divY = charY + charH + 30;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.moveTo(26, divY); ctx.lineTo(W-26, divY); ctx.stroke();

  // ── Score ──
  const scoreY = divY + 66;
  ctx.textAlign = 'center';
  ctx.font = `bold 78px "Courier New", monospace`;
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 40;
  ctx.fillText(String(score), W/2, scoreY);
  ctx.shadowBlur = 0;

  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillText('RISK SCORE', W/2, scoreY + 16);

  // ── Severity badge ──
  const badgeY = scoreY + 44;
  const badgeTxt = sev.toUpperCase();
  ctx.font = 'bold 13px "Courier New", monospace';
  const bw = ctx.measureText(badgeTxt).width + 28;
  const bx = (W - bw) / 2;
  ctx.fillStyle = color + '18';
  ctx.strokeStyle = color + '55';
  ctx.lineWidth = 1;
  ctx.fillRect(bx, badgeY - 17, bw, 26);
  ctx.strokeRect(bx, badgeY - 17, bw, 26);
  ctx.fillStyle = color;
  ctx.fillText(badgeTxt, W/2, badgeY + 3);

  // ── Repo name ──
  const raw = repoUrl ? repoUrl.replace('https://', '') : 'unknown';
  const display = raw.length > 36 ? '…' + raw.slice(-(35)) : raw;
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(display, W/2, badgeY + 30);

  // ── Bottom divider + footer ──
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.moveTo(26, H-36); ctx.lineTo(W-26, H-36); ctx.stroke();

  ctx.font = '8px "Courier New", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillText('gitscan.up.railway.app', W/2, H-20);

  ctx.textAlign = 'left';
  return canvas;
}

// ── URL detection ─────────────────────────────────────────────────────────────
function extractRepoUrl(raw) {
  const url = raw.trim().replace(/\/$/, '');
  let m = url.match(/^(https?:\/\/gitlawb\.com\/node\/repos\/[^\/\?#]+\/[^\/\?#]+)/);
  if (m) return m[1];
  m = url.match(/^(https?:\/\/(github\.com|gitlawb\.com)\/[^\/]+\/[^\/\?#]+)/);
  return m ? m[1] : null;
}

async function detectCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const repo = extractRepoUrl(tab?.url || '');
    if (repo) {
      detectedBar.style.display = 'block';
      detectedUrlEl.textContent = repo.replace('https://', '');
      noRepo.style.display = 'none';
      toggleBtn.style.display = 'block';
      return repo;
    }
  } catch {}
  detectedBar.style.display = 'none';
  noRepo.style.display = 'block';
  urlInput.style.display = 'block';
  toggleBtn.style.display = 'none';
  scanBtn.textContent = 'SCAN →';
  return null;
}

// ── Toggle ────────────────────────────────────────────────────────────────────
let useManual = false;
let detectedUrl = null;

toggleBtn.addEventListener('click', () => {
  useManual = !useManual;
  urlInput.style.display = useManual ? 'block' : 'none';
  detectedBar.style.display = useManual ? 'none' : 'block';
  toggleBtn.textContent = useManual ? '← use detected repo' : '+ paste a different URL';
  if (useManual) urlInput.focus();
});

// ── Stages UI ─────────────────────────────────────────────────────────────────
function renderStages(currentStatus) {
  const idx = STAGES.indexOf(currentStatus);
  stagesEl.innerHTML = '';
  STAGES.forEach((s, i) => {
    const wrap = document.createElement('div'); wrap.className = 'stage';
    const dot  = document.createElement('div');
    dot.className = 'stage-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
    const label = document.createElement('div');
    label.className = 'stage-label' + (i === idx ? ' active' : '');
    label.textContent = STAGE_LABEL[s];
    wrap.appendChild(dot); wrap.appendChild(label); stagesEl.appendChild(wrap);
    if (i < STAGES.length - 1) {
      const line = document.createElement('div');
      line.className = 'stage-line' + (i < idx ? ' done' : '');
      stagesEl.appendChild(line);
    }
  });
}

// ── Logs ──────────────────────────────────────────────────────────────────────
function appendLog(text) {
  const cursor = document.getElementById('cursor');
  if (cursor) cursor.remove();
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `<span class="log-prompt">></span><span class="log-text">${text}</span>`;
  logBox.appendChild(line);
  const newCursor = document.createElement('span');
  newCursor.id = 'cursor';
  logBox.appendChild(newCursor);
  logBox.scrollTop = logBox.scrollHeight;
}

// ── Show result ───────────────────────────────────────────────────────────────
function showResult(report, jobId, repoUrl) {
  lastReport = report; lastRepoUrl = repoUrl;
  const sev = report.severity || 'unknown';
  const color = SEV_COLOR[sev] || '#888';

  scoreNum.textContent = report.risk_score ?? '?';
  scoreNum.style.color = color;
  scoreCircle.style.borderColor = color;
  scoreCircle.style.boxShadow = `0 0 24px ${color}33, inset 0 0 12px ${color}08`;

  severityBadge.textContent = sev.toUpperCase();
  severityBadge.style.color = color;
  severityBadge.style.borderColor = color + '55';
  severityBadge.style.background = color + '11';

  summaryText.textContent = report.summary || '';

  const recs = report.top_recommendations || report.recommendations || [];
  if (recs.length > 0) {
    recsListEl.innerHTML = '';
    recs.slice(0, 4).forEach((rec, i) => {
      const item = document.createElement('div');
      item.className = 'rec-item';
      item.innerHTML = `<span class="rec-num">${i + 1}.</span><span class="rec-text">${rec}</span>`;
      recsListEl.appendChild(item);
    });
    recsEl.style.display = 'block';
  }

  reportBtn.href = `${BASE}/report/${jobId}`;

  cardBtn.onclick = () => {
    const canvas = generateShareCard(report, repoUrl, jobId);
    const dataUrl = canvas.toDataURL('image/png');
    const reportUrl = `${BASE}/report/${jobId}`;

    // Show preview
    cardPreviewImg.src = dataUrl;
    cardOverlay.classList.add('visible');

    // Download button
    cardDownloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `gitscan-${sev}-${(report.risk_score ?? 0)}.png`;
      a.click();
      cardDownloadBtn.textContent = '✓ Saved!';
      setTimeout(() => { cardDownloadBtn.textContent = '↓ Download PNG'; }, 2000);
    };

    // Tweet button
    cardTweetBtn.onclick = () => {
      const repo = repoUrl ? repoUrl.replace('https://', '') : 'repo';
      const sevEmoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢', clean: '🟢', unknown: '⚪' }[sev] || '⚪';
      const tweet = `🔍 Just scanned ${repo}\n\nRisk Score: ${report.risk_score ?? '?'}/100 — ${sevEmoji} ${sev.toUpperCase()}\n\nAudited with @gitlawbscan — free open-source repo security scanner\n\n📄 Full report:\n${reportUrl}\n\n#Web3Security #DevSec #gitscan`;
      chrome.tabs.create({ url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}` });
    };
  };

  resultEl.style.display = 'block';
  scanBtn.style.display = 'none';
}

// ── Poll ──────────────────────────────────────────────────────────────────────
function startPolling(jobId, repoUrl) {
  currentJobId = jobId; shownLogs = 0;
  if (termTitle && repoUrl) {
    const name = repoUrl.split('/').slice(-2).join('/');
    termTitle.textContent = `scanning — ${name}`;
  }
  pollInterval = setInterval(async () => {
    try {
      const r = await fetch(`${API}/scan/${jobId}`);
      if (!r.ok) { clearInterval(pollInterval); return; }
      const data = await r.json();
      renderStages(data.status);
      const logs = data.logs || [];
      while (shownLogs < logs.length) { appendLog(logs[shownLogs]); shownLogs++; }
      if (data.status === 'complete' && data.result?.report) {
        clearInterval(pollInterval);
        scanBtn.className = '';
        if (termTitle) termTitle.textContent = 'scan complete';
        showResult(data.result.report, jobId, repoUrl);
      } else if (data.status === 'error') {
        clearInterval(pollInterval);
        scanBtn.disabled = false; scanBtn.className = '';
        scanBtn.textContent = 'SCAN AGAIN →';
        if (termTitle) termTitle.textContent = 'scan failed';
        showError(data.error || 'Scan failed');
      }
    } catch {}
  }, 1800);
}

// ── Error / Reset ─────────────────────────────────────────────────────────────
function showError(msg) { errorBox.textContent = msg; errorBox.style.display = 'block'; }

function resetUI() {
  errorBox.style.display = 'none'; resultEl.style.display = 'none';
  statusEl.style.display = 'none'; recsEl.style.display = 'none';
  recsListEl.innerHTML = ''; logBox.innerHTML = '<span id="cursor"></span>';
  shownLogs = 0; lastReport = null; lastRepoUrl = null;
  scanBtn.style.display = 'block'; scanBtn.disabled = false;
  scanBtn.className = '';
  scanBtn.textContent = detectedUrl ? 'SCAN THIS REPO →' : 'SCAN →';
  if (pollInterval) clearInterval(pollInterval);
  if (termTitle) termTitle.textContent = 'glscan — waiting...';
}

rescanBtn.addEventListener('click', resetUI);

cardOverlayClose.addEventListener('click', () => cardOverlay.classList.remove('visible'));
cardOverlay.addEventListener('click', e => { if (e.target === cardOverlay) cardOverlay.classList.remove('visible'); });

// ── Start scan ────────────────────────────────────────────────────────────────
scanBtn.addEventListener('click', async () => {
  const raw = useManual ? urlInput.value.trim() : (detectedUrl || urlInput.value.trim());
  const target = raw.startsWith('http') ? raw : `https://${raw}`;
  const repoUrl = extractRepoUrl(target);
  if (!repoUrl) { showError('Paste a valid GitHub or Gitlawb repo URL.'); return; }

  resetUI();
  scanBtn.disabled = true; scanBtn.className = 'scanning'; scanBtn.textContent = 'SCANNING...';
  statusEl.style.display = 'block'; renderStages('queued');

  try {
    const r = await fetch(`${API}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl }),
    });
    if (!r.ok) throw new Error(await r.text());
    const { job_id } = await r.json();
    startPolling(job_id, repoUrl);
  } catch (e) {
    scanBtn.disabled = false; scanBtn.className = '';
    scanBtn.textContent = 'SCAN THIS REPO →';
    showError(e.message);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => { detectedUrl = await detectCurrentTab(); })();
