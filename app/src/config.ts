export interface SiteConfig {
  language: string
  siteTitle: string
  siteDescription: string
}

export interface NavigationLink {
  label: string
  href: string
}

export interface NavigationConfig {
  brandName: string
  links: NavigationLink[]
}

export interface HeroConfig {
  eyebrow: string
  titleLines: string[]
  leadText: string
  supportingNotes: string[]
}

export interface ManifestoConfig {
  videoPath: string
  text: string
}

export interface FacilityArticle {
  title: string
  paragraphs: string[]
}

export interface FacilityItem {
  slug: string
  name: string
  code: string
  address: string
  status: string
  email: string
  phone: string
  ctaText: string
  ctaHref: string
  image: string
  utcOffset: number
  article: FacilityArticle
}

export interface FacilitiesConfig {
  sectionLabel: string
  detailBackText: string
  detailNotFoundText: string
  detailReturnText: string
  items: FacilityItem[]
}

export interface ObservationConfig {
  sectionLabel: string
  videoPath: string
  statusText: string
  latLabel: string
  lonLabel: string
  initialLat: number
  initialLon: number
}

export interface ArchiveItem {
  src: string
  label: string
}

export interface ArchivesConfig {
  sectionLabel: string
  vaultTitle: string
  closeText: string
  items: ArchiveItem[]
}

export interface FooterConfig {
  copyrightText: string
  statusText: string
}

// ── gitscan Landing Page ──

export const siteConfig: SiteConfig = {
  language: "en",
  siteTitle: "gitscan — Security audits for the decentralized dev era",
  siteDescription: "gitscan scans Gitlawb and GitHub repos for secrets, vulnerabilities, and CVEs — then explains everything in plain English with AI-powered analysis.",
}

export const navigationConfig: NavigationConfig = {
  brandName: "gitscan",
  links: [
    { label: "Scan", href: "#scan" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Latest", href: "/activity" },
    { label: "Intel", href: "/intel" },
    { label: "Telegram Bot", href: "/bot" },
  ],
}

export const heroConfig: HeroConfig = {
  eyebrow: "Automated security scanning for Gitlawb & GitHub",
  titleLines: [
    "SECURITY",
    "AUDITS FOR THE",
    "DECENTRALIZED DEV ERA.",
  ],
  leadText: "gitscan scans Gitlawb and GitHub repos for secrets, vulnerabilities, and CVEs — then explains everything in plain English.",
  supportingNotes: [
    "TruffleHog detects leaked API keys, tokens, and private keys in your commit history.",
    "Semgrep analyzes code patterns to surface injection flaws and security anti-patterns.",
    "Claude AI transforms raw scanner output into human-readable reports with actionable fix recommendations.",
  ],
}

// How It Works
export interface StepItem {
  number: string
  title: string
  description: string
}

export const howItWorksConfig = {
  sectionLabel: "How it works",
  steps: [
    {
      number: "01",
      title: "PASTE REPO URL",
      description: "Drop any Gitlawb or GitHub repository URL into gitscan. No authentication, no setup — just paste and go.",
    },
    {
      number: "02",
      title: "SCANNERS RUN",
      description: "TruffleHog hunts for secrets. Semgrep audits code patterns. pip-audit, npm audit, and cargo audit scan dependencies for known CVEs.",
    },
    {
      number: "03",
      title: "AI REPORT",
      description: "Claude AI synthesizes all findings into a plain-English security report with severity levels, risk scores, and step-by-step remediation guidance.",
    },
  ] as StepItem[],
}

// Features
export interface FeatureItem {
  title: string
  code: string
  description: string
}

export const featuresConfig = {
  sectionLabel: "Features",
  items: [
    {
      title: "SECRETS DETECTION",
      code: "TRF-01",
      description: "TruffleHog digs through your entire commit history to uncover API keys, tokens, private keys, and credentials that never should have been committed.",
    },
    {
      title: "SAST ANALYSIS",
      code: "SMG-02",
      description: "Semgrep performs static application security testing across your codebase — identifying injection vulnerabilities, unsafe patterns, and compliance violations.",
    },
    {
      title: "DEPENDENCY AUDIT",
      code: "AUD-03",
      description: "pip-audit, npm audit, and cargo audit scan your dependency tree against the latest CVE databases to surface vulnerable packages with upgrade paths.",
    },
    {
      title: "AI ANALYSIS",
      code: "AI-04",
      description: "Claude AI reads every scanner output and produces a unified human-readable report — prioritizing risks, explaining impact, and recommending precise fixes.",
    },
    {
      title: "TELEGRAM BOT",
      code: "TGB-05",
      description: "Run /scan <repo-url> from anywhere. The gitscan bot delivers live status updates and a full formatted security report directly in Telegram.",
    },
    {
      title: "GITLAWB NATIVE",
      code: "GLB-06",
      description: "Built for the decentralized development era. First-class support for Gitlawb repositories with the same deep-scanning power as GitHub.",
    },
  ] as FeatureItem[],
}

// Tech Stack
export interface TechItem {
  name: string
  category: string
  description: string
}

export const techStackConfig = {
  sectionLabel: "Tech Stack",
  items: [
    {
      name: "TruffleHog",
      category: "SECRET SCANNING",
      description: "Deep inspection of commit history for credentials and tokens across 750+ detector types.",
    },
    {
      name: "Semgrep",
      category: "STATIC ANALYSIS",
      description: "Lightweight static analysis for finding bugs, security issues, and enforcing code standards.",
    },
    {
      name: "Claude AI",
      category: "INTELLIGENCE",
      description: "Anthropic's Claude interprets scanner output and generates actionable human-readable reports.",
    },
    {
      name: "FastAPI",
      category: "BACKEND",
      description: "High-performance Python web framework serving the scan orchestration API and webhook handlers.",
    },
    {
      name: "React",
      category: "FRONTEND",
      description: "Component-based UI for scan dashboards, report visualization, and real-time status tracking.",
    },
  ] as TechItem[],
}

// CTA Section
export const ctaConfig = {
  headline: "START SCANNING FOR FREE",
  subtext: "Paste any Gitlawb or GitHub repo URL. Get a full security report in seconds. No sign-up required.",
  primaryCta: "Scan Your Repo →",
  primaryHref: "#scan",
  secondaryCta: "View on GitHub",
  secondaryHref: "https://github.com/gitlawb",
}

// ── gitscan Bot Page ──

export const botConfig = {
  siteTitle: "gitscan bot — Security scans in Telegram",
  siteDescription: "Run security scans on any Gitlawb or GitHub repository directly from Telegram. Get AI-powered security reports with secrets detection, SAST analysis, and dependency auditing.",
  hero: {
    eyebrow: "Telegram Bot",
    titleLines: ["GITSCAN", "BOT"],
    tagline: "Security scans. Right in Telegram.",
    description: "Run /scan on any Gitlawb or GitHub repo URL and get a full AI-analyzed security report delivered directly to your chat. No login. No setup. Just answers.",
    ctaText: "Add to Telegram",
    ctaHref: "https://t.me/gitlawbscanbot",
  },
  navigation: {
    brandName: "gitscan bot",
    links: [
      { label: "Demo", href: "#demo" },
      { label: "Commands", href: "#commands" },
      { label: "Add Bot", href: "#add" },
    ],
  },
  chatDemo: {
    sectionLabel: "Live Demo",
    messages: [
      { type: "sent", text: "/scan https://github.com/gitlawb/openclaude" },
      { type: "received", text: "CLONING REPOSITORY...\n\n> git clone https://github.com/gitlawb/openclaude\n> 142 files, 3.2 MB\n> analyzing file tree..." },
      { type: "received", text: "RUNNING SECURITY SCANNERS...\n\n[secrets]    truffleHog v3.82.2\n[sast]       semgrep v1.90.0\n[deps]       pip-audit + npm audit\n\nScanning 142 files across 3 languages..." },
      { type: "received", text: "AI IS ANALYZING RESULTS...\n\nClaude is reading scanner outputs,\nprioritizing findings, generating\nrecommendations..." },
    ],
    finalReport: {
      type: "report" as const,
      riskScore: "72/100",
      riskLevel: "MODERATE",
      secrets: 2,
      sast: 4,
      deps: 1,
      topRecommendations: [
        "Rotate exposed AWS_ACCESS_KEY_ID in config.py:47",
        "Fix SQL injection in auth.py:128 — use parameterized queries",
        "Update lodash 4.17.15 → 4.17.21 (CVE-2020-8203)",
        "Add input validation to user.profile endpoint",
      ],
    },
  },
  commandsConfig: {
    sectionLabel: "Commands",
    commands: [
      { command: "/scan <url>", description: "Run a full security scan on any Gitlawb or GitHub repository" },
      { command: "/status", description: "Check the status of your most recent scan" },
      { command: "/help", description: "Show available commands and usage tips" },
      { command: "/start", description: "Initialize the bot and see the welcome message" },
    ],
  },
  howToAddConfig: {
    sectionLabel: "How to add",
    steps: [
      { number: "01", title: "SEARCH @gitlawbscanbot", description: "Open Telegram and search for @gitlawbscanbot in the global search bar." },
      { number: "02", title: "START", description: "Tap the Start button or send /start to activate the bot and see the welcome message." },
      { number: "03", title: "/SCAN <URL>", description: "Send /scan followed by any Gitlawb or GitHub repo URL. Your report arrives in seconds." },
    ],
  },
}

// ── Shared Configs ──

export const manifestoConfig: ManifestoConfig = {
  videoPath: "",
  text: "",
}

export const facilitiesConfig: FacilitiesConfig = {
  sectionLabel: "",
  detailBackText: "",
  detailNotFoundText: "",
  detailReturnText: "",
  items: [],
}

export const observationConfig: ObservationConfig = {
  sectionLabel: "",
  videoPath: "",
  statusText: "",
  latLabel: "",
  lonLabel: "",
  initialLat: 0,
  initialLon: 0,
}

export const archivesConfig: ArchivesConfig = {
  sectionLabel: "",
  vaultTitle: "",
  closeText: "",
  items: [],
}

export const footerConfig: FooterConfig = {
  copyrightText: "2026 gitscan",
  statusText: "Built for gitlawb.com",
}
