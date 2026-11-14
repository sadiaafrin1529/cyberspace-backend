import sanitize from 'sanitize-html';

const RICH_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
    'h2', 'h3', 'h4', 'blockquote', 'a',
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitize.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
};

export const sanitizeRich = (html: string): string => sanitize(html, RICH_OPTIONS).trim();

export const stripHtml = (html: string): string =>
  sanitize(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
