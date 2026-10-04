/**
 * Product identity. Repo slug is `stackmap`.
 * github.com/markmarvik/aetheris still redirects to the renamed repo.
 * The old Pages URL does not.
 * PUBLIC_URL is build-time SITE_URL (VITE_SITE_URL). Default host is Cloudflare Pages.
 */
export const PRODUCT_NAME = 'StackMap';
export const LEGACY_NAME = 'Aetheris';
export const TAGLINE = 'Longevity Constellation';
export const FORMERLY_LINE = 'formerly Aetheris';
export const REPO_SLUG = 'stackmap';

// import.meta.env is undefined when plain Node imports this file.
const rawSiteUrl = import.meta.env?.VITE_SITE_URL || 'https://stackmap.pages.dev/';
export const PUBLIC_URL = rawSiteUrl.endsWith('/') ? rawSiteUrl : `${rawSiteUrl}/`;
// Host + path, no protocol and no trailing slash.
export const PUBLIC_HOST_LABEL = PUBLIC_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
