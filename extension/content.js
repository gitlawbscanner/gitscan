// Content script: inject gitscan badge on GitHub/Gitlawb repo pages if already scanned
const API = 'https://gitscan-production.up.railway.app';

const SEV_COLOR = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#888',
};

async function injectBadge() {
  const repoUrl = location.href.split('?')[0].replace(/\/$/, '');

  // Only inject on actual repo pages (has at least user/repo in path)
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return;

  try {
    const r = await fetch(`${API}/recent`);
    if (!r.ok) return;
    const scans = await r.json();
    const match = scans.find(s =>
      repoUrl.includes(s.repo_url) || s.repo_url.includes(repoUrl)
    );
    if (!match) return;

    const color = SEV_COLOR[match.severity] || '#888';
    const badge = document.createElement('a');
    badge.href = match.last_job_id
      ? `https://gitscan.up.railway.app/report/${match.last_job_id}`
      : 'https://gitscan.up.railway.app';
    badge.target = '_blank';
    badge.title = `gitscan: Risk ${match.risk_score}/100 — ${match.severity}`;
    badge.style.cssText = `
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 8px; border-radius: 3px; margin-left: 8px;
      background: #0d0d0d; border: 1px solid ${color}44;
      font-family: 'SFMono-Regular', monospace; font-size: 11px;
      color: ${color}; text-decoration: none; vertical-align: middle;
      line-height: 1;
    `;
    badge.innerHTML = `
      <span style="color:rgba(255,255,255,0.35);font-size:10px;">gitscan</span>
      <span style="font-weight:600;">${match.risk_score}</span>
      <span style="font-size:9px;letter-spacing:0.05em;opacity:0.8;">${match.severity.toUpperCase()}</span>
    `;

    // Try to inject next to repo name heading on GitHub
    const target =
      document.querySelector('[itemprop="name"]') ||
      document.querySelector('strong[itemprop="name"] a')?.parentElement ||
      document.querySelector('.repository-content h1') ||
      document.querySelector('h1.heading');

    if (target) target.appendChild(badge);
  } catch {}
}

// Run after page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectBadge);
} else {
  injectBadge();
}
