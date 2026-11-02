import { assertValidOpenApiConfig } from './openapiSpecUrls.js';

/**
 * Framework-owned doc paths (generated or vendored), merged into the docs index.
 * @type {string[]}
 */
export const frameworkDocPaths = [];

/**
 * Shared documentation tree configuration.
 *
 * This file is the single source of truth for the docs structure. It is used by:
 * - src/data/documentation.ts
 * - scripts/generate-docs.mjs
 * - scripts/generate-llms.mjs
 */

/**
 * @typedef {Object} FileItem
 * @property {string} name
 * @property {string} path
 * @property {'file' | 'directory'} type
 * @property {FileItem[]} [children]
 * @property {boolean} [expanded]
 * @property {string[]} [tags]
 * @property {string} [description]
 * @property {string} [icon]
 * @property {number} [order]
 * @property {boolean} [hidden]
 */

/**
 * @typedef {Object} HomepageConfig
 * @property {boolean} enabled
 * @property {Object} hero
 * @property {Object} [hero.artwork]
 * @property {Object[]} [features]
 * @property {Object} [quickStart]
 */

/** @type {{ current: string, versions: string[], labels: Record<string, string>, enabled: boolean }} */
export const versionConfig = {
  current: '1.0',
  versions: ['1.0'],
  labels: {
    '1.0': 'Latest',
  },
  enabled: false,
};

/** @type {{ enabled: boolean, defaultLocale: string, locales: string[], labels?: Record<string, string> }} */
export const i18nConfig = {
  enabled: false,
  defaultLocale: 'en',
  locales: ['en'],
  labels: {
    en: 'EN',
  },
};

/**
 * Interface label overrides per locale (keys from shared/uiStrings.js). Any
 * label you leave out keeps its English default. Example:
 *   fr: { previous: 'Précédent', next: 'Suivant', lastUpdated: 'Mis à jour le' }
 * @type {Record<string, Record<string, string>>}
 */
export const uiStringsConfig = {};

/**
 * Site chrome — language switcher placement + sidebar skin.
 * @type {{
 *   languageSwitcher: { enabled: 'auto' | boolean, placement: Array<'sidebar' | 'command-palette'> },
 *   sidebarVariant: 'groups' | 'groups',
 * }}
 */
export const chromeConfig = {
  languageSwitcher: {
    enabled: 'auto',
    placement: ['sidebar', 'command-palette'],
  },
  /** groups = section headers + page list; tree = classic file tree */
  sidebarVariant: 'groups',
};

/**
 * Instance branding — product mark, copyright, optional attribution, social links.
 * Set attribution to null to hide the credit line.
 * @type {{
 *   productName: string,
 *   logo?: { src: string, alt: string } | null,
 *   heroFont?: 'brand' | 'title',
 *   copyright: { holder: string, year?: number, notice?: string },
 *   attribution: { text: string, href?: string } | null,
 *   social: Array<{ name: string, href: string, icon: string }>,
 * }}
 */
export const brandingConfig = {
  productName: 'Autoloot Dev Docs',
  logo: {
    src: '/autoloot-mark.png',
    alt: 'Autoloot',
  },
  heroFont: 'title',
  copyright: {
    holder: 'Autoloot',
  },
  attribution: {
    text: 'Built with Papers',
    href: 'https://github.com/thomasjvu/papers',
  },
  social: [],
};

/** @type {import('./documentation-config.js').OpenApiConfig} */
export const openapiConfig = {
  enabled: false,
  pagePath: 'api-reference/openapi',
  defaultSpecId: '',
  allowedOrigins: [],
  specs: [],
};

assertValidOpenApiConfig(openapiConfig);

/** @type {{ enabled: boolean, title?: string, subtitle?: string, route?: string, sourcePath?: string }} */
export const designBookConfig = {
  enabled: false,
  title: 'Design Book',
  subtitle: 'Visual identity & tokens',
  route: '/design',
  sourcePath: 'DESIGN.md',
};

/** @type {HomepageConfig} */
export const homepageConfig = {
  enabled: false,
  hero: {
    title: 'Autoloot',
    subtitle: 'Your next drop, under control.',
    description:
      'The guide to running a Twitch shop: prepare your inventory, let chat pick the next lot, sell live, and take every order through fulfillment.',
    artwork: {
      src: '/images/autoloot-studio.png',
      alt: 'Autoloot creator workspace',
      width: 1440,
      height: 900,
      caption: 'One local workspace for your next Twitch drop.',
    },
    cta: {
      primary: {
        text: 'Run your first demo',
        href: '/docs/developers/architecture',
      },
      secondary: {
        text: 'Explore the guides',
        href: '/docs/design/design',
      },
    },
  },
  features: [
    {
      title: 'Run the show',
      description: 'Prepare lots, run timed auctions, and let chat choose the next drop.',
      icon: 'mingcute:flash-line',
    },
    {
      title: 'Take care of orders',
      description: 'Connect Checkout, track payment status, and manage fulfillment.',
      icon: 'mingcute:shopping-bag-2-line',
    },
    {
      title: 'Meet your cohost',
      description: 'Review listing drafts and use Mochi in your workspace and overlay.',
      icon: 'mingcute:sparkles-line',
    },
    {
      title: 'Know the boundaries',
      description: 'Understand local data, buyer privacy, and what this build supports.',
      icon: 'mingcute:shield-line',
    },
  ],
  quickStart: {
    title: 'From setup to first sale',
    steps: [
      {
        title: 'Install dependencies (Node.js 22+)',
        code: 'npm ci',
      },
      {
        title: 'Start the local workspace',
        code: 'npm start',
      },
      {
        title: 'Open the creator dashboard',
        code: 'http://localhost:4173',
      },
      {
        title: 'Try a demo buyer purchase',
        code: 'http://localhost:4173/shop',
      },
    ],
  },
  footer: {
    links: [
      {
        text: 'Architecture',
        href: '/docs/developers/architecture',
      },
      {
        text: 'Design system',
        href: '/docs/design/design',
      },
      {
        text: 'API reference',
        href: '/docs/developers/api',
      },
    ],
  },
};

const page = (name, path) => ({ type: 'file', name: `${name}.md`, path });

/** @type {FileItem[]} */
export const documentationTree = [
  {
    type: 'directory', name: 'Developer reference', path: 'developers', expanded: true,
    children: [
      page('Architecture', 'developers/architecture'),
      page('HTTP API', 'developers/api'),
      page('Documentation maintenance', 'developers/documentation'),
      page('Lifecycle contracts', 'developers/lifecycles'),
      page('Release checks', 'developers/release'),
      page('Hosted runtime', 'developers/hosted-migration'),
      page('Deployment targets', 'developers/deployment'),
      page('Storage and recovery', 'developers/storage'),
      page('Roadmap', 'developers/roadmap'),
      page('Live rehearsal', 'developers/live-rehearsal'),
      page('Artwork prompts', 'developers/hero-art'),
    ],
  },
  {
    type: 'directory', name: 'Design system', path: 'design', expanded: true,
    children: [
      page('Design system', 'design/design'),
      page('Stylesheet ownership', 'design/styles'),
    ],
  },
  {
    type: 'directory', name: 'Audits', path: 'audits',
    children: [
      page('Polish audit · October 30, 2026', 'audits/polish-audit-2026-10-30'),
      page('Security review · November 1, 2026', 'audits/security-review-2026-11-01'),
      page('Runtime authenticity', 'audits/runtime-authenticity-audit'),
      page('Security review · October 27, 2026', 'audits/security-review-2026-10-27'),
      page('Production audit', 'audits/production-audit'),
    ],
  },
];
