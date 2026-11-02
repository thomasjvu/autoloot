import { assertValidOpenApiConfig } from "./openapiSpecUrls.js";

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

/**
 * Docs URL base path. '/docs' (default) serves pages at /docs/<page>;
 * '' or '/' serves them at the site root (/<page>), next to the homepage.
 * @type {{ basePath: string }}
 */
export const docsRoutingConfig = {
  basePath: "/docs",
};

/** @type {{ current: string, versions: string[], labels: Record<string, string>, enabled: boolean }} */
export const versionConfig = {
  current: "1.0",
  versions: ["1.0"],
  labels: {
    "1.0": "Latest",
  },
  enabled: false,
};

/** @type {{ enabled: boolean, defaultLocale: string, locales: string[], labels?: Record<string, string> }} */
export const i18nConfig = {
  enabled: false,
  defaultLocale: "en",
  locales: ["en"],
  labels: {
    en: "EN",
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
 * Site chrome — language switcher placement, sidebar skin, and menu typography.
 * @type {{
 *   languageSwitcher: { enabled: 'auto' | boolean, placement: Array<'sidebar' | 'command-palette'> },
 *   sidebarVariant: 'tree' | 'groups',
 *   navigationFont?: 'mono' | 'body',
 * }}
 */
export const chromeConfig = {
  languageSwitcher: {
    enabled: "auto",
    placement: ["sidebar", "command-palette"],
  },
  /** groups = section headers + page list; tree = classic file tree */
  sidebarVariant: "groups",
  /** Optional site-owned menu font; omit to keep each sidebar's original typography. */
  // navigationFont: 'mono',
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
  productName: "Autoloot",
  logo: {
    src: "/autoloot-mark.png",
    alt: "Autoloot",
  },
  heroFont: "title",
  copyright: {
    holder: "Autoloot",
  },
  attribution: {
    text: "Built with Papers",
    href: "https://github.com/thomasjvu/papers",
  },
  social: [],
};

/** @type {import('./documentation-config.js').OpenApiConfig} */
export const openapiConfig = {
  enabled: false,
  pagePath: "api-reference/openapi",
  defaultSpecId: "",
  allowedOrigins: [],
  specs: [],
};

assertValidOpenApiConfig(openapiConfig);

/** @type {{ enabled: boolean, title?: string, subtitle?: string, route?: string, sourcePath?: string }} */
export const designBookConfig = {
  enabled: false,
  title: "Design Book",
  subtitle: "Visual identity & tokens",
  route: "/design",
  sourcePath: "DESIGN.md",
};

/** @type {HomepageConfig} */
export const homepageConfig = {
  enabled: false,
  hero: {
    title: "Autoloot",
    subtitle: "Your next drop, under control.",
    description:
      "The guide to running a Twitch shop: prepare your inventory, let chat pick the next lot, sell live, and take every order through fulfillment.",
    artwork: {
      src: "/images/autoloot-studio.png",
      alt: "Autoloot creator workspace",
      width: 1440,
      height: 900,
      caption: "One local workspace for your next Twitch drop.",
    },
    cta: {
      primary: {
        text: "Run your first demo",
        href: "/docs/getting-started/quick-start",
      },
      secondary: {
        text: "Explore the guides",
        href: "/docs/getting-started/introduction",
      },
    },
  },
  features: [
    {
      title: "Run the show",
      description:
        "Prepare lots, run timed auctions, and let chat choose the next drop.",
      icon: "mingcute:flash-line",
    },
    {
      title: "Take care of orders",
      description:
        "Connect Checkout, track payment status, and manage fulfillment.",
      icon: "mingcute:shopping-bag-2-line",
    },
    {
      title: "Meet your cohost",
      description:
        "Review listing drafts and use Mochi in your workspace and overlay.",
      icon: "mingcute:sparkles-line",
    },
    {
      title: "Know the boundaries",
      description:
        "Understand local data, buyer privacy, and what this build supports.",
      icon: "mingcute:shield-line",
    },
  ],
  quickStart: {
    title: "From setup to first sale",
    steps: [
      {
        title: "Install dependencies (Node.js 22+)",
        code: "npm ci",
      },
      {
        title: "Start the local workspace",
        code: "npm start",
      },
      {
        title: "Open the creator dashboard",
        code: "http://localhost:4173",
      },
      {
        title: "Try a demo buyer purchase",
        code: "http://localhost:4173/shop",
      },
    ],
  },
  footer: {
    links: [
      {
        text: "Quick start",
        href: "/docs/getting-started/quick-start",
      },
      {
        text: "Troubleshooting",
        href: "/docs/operations/troubleshooting",
      },
      {
        text: "FAQ",
        href: "/docs/getting-started/faq",
      },
    ],
  },
};

/** @type {FileItem[]} */
export const documentationTree = [
  {
    type: "directory",
    name: "Getting started",
    path: "getting-started",
    expanded: true,
    children: [
      {
        type: "file",
        name: "Overview.md",
        path: "getting-started/introduction",
      },
      {
        type: "file",
        name: "Installation.md",
        path: "getting-started/installation",
      },
      {
        type: "file",
        name: "Quick walkthrough.md",
        path: "getting-started/walkthrough",
      },
      { type: "file", name: "FAQ.md", path: "getting-started/faq" },
      {
        type: "file",
        name: "Demo walkthrough.md",
        path: "getting-started/quick-start",
      },
      {
        type: "file",
        name: "Configuration.md",
        path: "getting-started/configuration",
      },
    ],
  },
  {
    type: "directory",
    name: "Streamer guide",
    path: "streamer",
    expanded: false,
    children: [
      {
        type: "file",
        name: "Inventory.md",
        path: "streamer/inventory",
      },
      {
        type: "file",
        name: "Auctions and voting.md",
        path: "streamer/auctions",
      },
      {
        type: "file",
        name: "Orders and fulfillment.md",
        path: "streamer/orders",
      },
      {
        type: "file",
        name: "Catalog and Rip studio.md",
        path: "streamer/catalog-and-rip",
      },
    ],
  },
  {
    type: "directory",
    name: "Buyer guide",
    path: "buyers",
    expanded: false,
    children: [
      {
        type: "file",
        name: "Buying and tracking.md",
        path: "buyers/storefront",
      },
    ],
  },
  {
    type: "directory",
    name: "Integrations",
    path: "integrations",
    expanded: false,
    children: [
      {
        type: "file",
        name: "Twitch.md",
        path: "integrations/twitch",
      },
      {
        type: "file",
        name: "Stripe Checkout.md",
        path: "integrations/stripe",
      },
      {
        type: "file",
        name: "Codex companion.md",
        path: "integrations/codex",
      },
      {
        type: "file",
        name: "OBS overlay.md",
        path: "integrations/obs",
      },
    ],
  },
  {
    type: "directory",
    name: "Operations",
    path: "operations",
    children: [
      {
        type: "file",
        name: "Sales & numbers.md",
        path: "operations/accounting",
      },
      {
        type: "file",
        name: "Agent-led runs.md",
        path: "operations/agent-led-runs",
      },
      {
        type: "file",
        name: "Bidding and private maximums.md",
        path: "operations/bidding",
      },
      {
        type: "file",
        name: "Connect Codex.md",
        path: "operations/codex-connection",
      },
      {
        type: "file",
        name: "Reown / WalletConnect USDC checkout.md",
        path: "operations/crypto-checkout",
      },
      {
        type: "file",
        name: "CSV and shipping.md",
        path: "operations/csv-and-shipping",
      },
      {
        type: "file",
        name: "Giveaway claims and history.md",
        path: "operations/giveaways",
      },
      { type: "file", name: "Data and limits.md", path: "operations/limits" },
      {
        type: "file",
        name: "Metadata catalog access.md",
        path: "operations/metadata",
      },
      {
        type: "file",
        name: "NFT delivery and agent-wallet tools.md",
        path: "operations/nft-delivery",
      },
      {
        type: "file",
        name: "Operator policies and AI disclosures.md",
        path: "operations/operator-policies",
      },
      {
        type: "file",
        name: "Payment onboarding decision.md",
        path: "operations/payment-onboarding",
      },
      {
        type: "file",
        name: "Shipping labels: Shippo and Pirate Ship.md",
        path: "operations/shipping",
      },
      {
        type: "file",
        name: "Troubleshooting.md",
        path: "operations/troubleshooting",
      },
      {
        type: "file",
        name: "Twitch and OBS integration.md",
        path: "operations/twitch-widgets",
      },
      { type: "file", name: "Livestream vision.md", path: "operations/vision" },
    ],
  },

];
