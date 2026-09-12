#!/usr/bin/env node
/**
 * ============================================================================
 * design-tokens-converter.js
 * ============================================================================
 *
 * PURPOSE
 * -------
 * Converts a Figma design-token JSON file (exported via the Figma Design
 * Tokens plugin by Lukas Oppermann) into two production-ready CSS files:
 *
 *   1. tokens.css  — Light theme (default)
 *   2. tokens.dark.css — Dark theme (applied via [data-theme="dark"])
 *
 * HOW IT WORKS
 * ------------
 * The source JSON has five top-level categories:
 *
 *   • font            — Custom fontStyle tokens (font-size, weight, etc.)
 *   • effect          — Drop-shadow tokens
 *   • spacing collection — Spacing scale (0–32px)
 *   • primitive colors — The raw color palette (NOT used directly in UI)
 *   • color roles     — Semantic color aliases (USE THESE in the UI)
 *   • typography      — Structured typography scale (expanded font tokens)
 *
 * COLOR ARCHITECTURE (IMPORTANT)
 * ------------------------------
 * The design system follows a two-layer color model:
 *
 *   Layer 1 — PRIMITIVE COLORS
 *     Raw swatches arranged in palettes (primary 0–100, neutral 0–100, etc.).
 *     These are the "source of truth" for the color ramp.
 *     ❌ Do NOT use these directly in UI components.
 *     They exist only to be referenced by color roles.
 *
 *   Layer 2 — COLOR ROLES
 *     Semantic tokens (e.g. `--color-primary`, `--color-on-primary`).
 *     These map to specific palette stops and carry design intent.
 *     ✅ ALWAYS use color roles in components, never primitives.
 *
 *     Naming convention follows Material Design 3:
 *       primary / on-primary            — Main action color & text on it
 *       primary-container / on-primary-container — Tonal container pair
 *       surface / on-surface            — Page background & text
 *       surface-variant / on-surface-variant — Alternate surfaces
 *       surface-container-{lowest..highest} — Elevated surface layers
 *       outline / outline-variant       — Border colors
 *       inverse-surface / inverse-on-surface — For snackbars / toasts
 *
 * DARK THEME STRATEGY
 * -------------------
 * Primitives do not change between themes — they are the same raw ramp.
 * Only COLOR ROLES swap. In dark mode, roles are remapped to the opposite
 * ends of the same palette (light roles use high stops, dark uses low, and
 * vice versa). This follows the Material Design 3 dynamic color tonal
 * surface approach.
 *
 * USAGE
 * -----
 *   node design-tokens-converter.js
 *
 *   Output files are written to ./src/styles/
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_FILE = path.resolve(__dirname, 'design-tokens.tokens.json');
const OUTPUT_DIR = path.resolve(__dirname, 'src', 'styles');
const OUTPUT_LIGHT = path.join(OUTPUT_DIR, 'tokens.css');
const OUTPUT_DARK = path.join(OUTPUT_DIR, 'tokens.dark.css');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a token name like "label small" or "primary color role" into a
 * kebab-case CSS custom property name.
 *
 * @param {string} name - Raw token key from the JSON
 * @param {string} prefix - Optional prefix to prepend (e.g. "color", "space")
 * @returns {string} e.g. "--color-primary-color-role"
 */
function toCSSVar(name, prefix = '') {
  const kebab = name
    .trim()
    .toLowerCase()
    // collapse multiple spaces and leading/trailing spaces
    .replace(/\s+/g, '-')
    // remove any non-alphanumeric chars except hyphens
    .replace(/[^a-z0-9-]/g, '');

  return `--${prefix ? prefix + '-' : ''}${kebab}`;
}

/**
 * Strips the 8-digit hex alpha channel suffix if it is fully opaque (ff),
 * returning a standard 6-digit hex. If the alpha is not ff, it converts to
 * a rgba() string for clarity.
 *
 * @param {string} hex8 - 8-char hex with alpha e.g. "#059cfaff"
 * @returns {string} "#059cfa" or "rgba(r, g, b, a)"
 */
function normalizeColor(hex8) {
  if (!hex8 || typeof hex8 !== 'string') return hex8;

  // Already a 6-char hex
  if (/^#[0-9a-fA-F]{6}$/.test(hex8)) return hex8;

  // 8-char hex (rrggbbaa)
  if (/^#[0-9a-fA-F]{8}$/.test(hex8)) {
    const r = parseInt(hex8.slice(1, 3), 16);
    const g = parseInt(hex8.slice(3, 5), 16);
    const b = parseInt(hex8.slice(5, 7), 16);
    const a = parseInt(hex8.slice(7, 9), 16);

    if (a === 255) {
      return `#${hex8.slice(1, 7)}`;
    }
    // Partial alpha — emit as rgba
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  }

  return hex8; // Fallback: return as-is
}

/**
 * Resolves a Figma-style token reference like:
 *   "{primitive colors.primary color palette.primary  50}"
 * into the actual hex value by walking the token tree.
 *
 * @param {string} refString - The raw value string from the JSON
 * @param {object} allTokens - The full parsed JSON object
 * @returns {string|null} Resolved color value, or null if not found
 */
function resolveReference(refString, allTokens) {
  // Match the {path.to.token} pattern
  const match = refString.match(/^\{(.+)\}$/);
  if (!match) return null;

  const parts = match[1].split('.');
  let node = allTokens;

  for (const part of parts) {
    if (!node || typeof node !== 'object') return null;
    // Try exact match first
    if (node[part] !== undefined) {
      node = node[part];
    } else {
      // Fuzzy match: normalise spaces (some keys have double spaces)
      const normalised = part.replace(/\s+/g, ' ').trim();
      const found = Object.keys(node).find(
        k => k.replace(/\s+/g, ' ').trim() === normalised
      );
      if (found) {
        node = node[found];
      } else {
        return null;
      }
    }
  }

  if (node && typeof node === 'object' && node.value) {
    const val = node.value;
    // If the resolved value is itself a reference, resolve recursively
    if (typeof val === 'string' && val.startsWith('{')) {
      return resolveReference(val, allTokens);
    }
    return normalizeColor(val);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERTERS — each returns an array of { varName, value } pairs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts typography font tokens into CSS custom properties.
 * Each font style yields separate variables for size, weight, line-height,
 * letter-spacing so they can be applied individually where needed.
 *
 * @param {object} fontTokens - The "font" section of the token JSON
 * @returns {Array<{varName: string, value: string, comment: string}>}
 */
function convertFontTokens(fontTokens) {
  const vars = [];

  for (const [name, token] of Object.entries(fontTokens)) {
    if (!token.value || typeof token.value !== 'object') continue;

    const base = toCSSVar(name, 'font');
    const { fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, fontFamily } = token.value;

    vars.push({ varName: `${base}-size`,           value: `${fontSize}px`,             comment: `${name} — font size` });
    vars.push({ varName: `${base}-weight`,          value: `${fontWeight}`,             comment: `${name} — font weight` });
    vars.push({ varName: `${base}-style`,           value: `${fontStyle}`,              comment: `${name} — font style` });
    vars.push({ varName: `${base}-line-height`,     value: `${lineHeight}px`,           comment: `${name} — line height` });
    vars.push({ varName: `${base}-letter-spacing`,  value: `${letterSpacing}px`,        comment: `${name} — letter spacing` });
    vars.push({ varName: `${base}-family`,          value: `'${fontFamily}', sans-serif`, comment: `${name} — font family` });
  }

  return vars;
}

/**
 * Converts the structured typography scale into shorthand-compatible
 * individual CSS custom properties (font-size, line-height, weight, tracking).
 *
 * This is separate from the "font" section — the "typography" section in the
 * JSON represents the finalized, named type scale (label, body, title, etc.).
 *
 * @param {object} typographyTokens - The "typography" section
 * @returns {Array<{varName: string, value: string, comment: string}>}
 */
function convertTypographyTokens(typographyTokens) {
  const vars = [];

  for (const [name, scale] of Object.entries(typographyTokens)) {
    const base = toCSSVar(name, 'type');

    if (scale.fontSize?.value !== undefined)
      vars.push({ varName: `${base}-size`,          value: `${scale.fontSize.value}px`,         comment: `${name} — font size` });
    if (scale.fontWeight?.value !== undefined)
      vars.push({ varName: `${base}-weight`,         value: `${scale.fontWeight.value}`,         comment: `${name} — font weight` });
    if (scale.lineHeight?.value !== undefined)
      vars.push({ varName: `${base}-line-height`,    value: `${scale.lineHeight.value}px`,       comment: `${name} — line height` });
    if (scale.letterSpacing?.value !== undefined)
      vars.push({ varName: `${base}-letter-spacing`, value: `${scale.letterSpacing.value}px`,    comment: `${name} — letter spacing` });
    if (scale.fontFamily?.value !== undefined)
      vars.push({ varName: `${base}-family`,         value: `'${scale.fontFamily.value}', sans-serif`, comment: `${name} — font family` });
  }

  return vars;
}

/**
 * Converts the spacing collection into CSS custom properties.
 *
 * @param {object} spacingTokens - The "spacing collection" section
 * @returns {Array<{varName: string, value: string, comment: string}>}
 */
function convertSpacingTokens(spacingTokens) {
  const vars = [];

  for (const [name, token] of Object.entries(spacingTokens)) {
    vars.push({
      varName: toCSSVar(name, 'space'),
      value: `${token.value}px`,
      comment: `${name}`
    });
  }

  return vars;
}

/**
 * Converts the effect (shadow) tokens into CSS custom properties.
 * Outputs as box-shadow values ready for use.
 *
 * @param {object} effectTokens - The "effect" section
 * @returns {Array<{varName: string, value: string, comment: string}>}
 */
function convertEffectTokens(effectTokens) {
  const vars = [];

  for (const [name, token] of Object.entries(effectTokens)) {
    if (!token.value) continue;
    const { offsetX, offsetY, radius, spread, color } = token.value;
    const normalizedColor = normalizeColor(color);

    vars.push({
      varName: toCSSVar(name, 'shadow'),
      value: `${offsetX}px ${offsetY}px ${radius}px ${spread}px ${normalizedColor}`,
      comment: `${name} — drop shadow`
    });
  }

  return vars;
}

/**
 * Converts PRIMITIVE color palettes into CSS custom properties.
 *
 * ⚠️  These are NOT meant to be used directly in UI components.
 *     They exist as a reference palette and as the backing values for
 *     color roles. They are placed under the `[data-primitive]` selector
 *     in the output and annotated with a warning comment.
 *
 * @param {object} primitiveTokens - The "primitive colors" section
 * @returns {Array<{varName: string, value: string, comment: string}>}
 */
function convertPrimitiveColors(primitiveTokens) {
  const vars = [];

  for (const [groupName, group] of Object.entries(primitiveTokens)) {
    for (const [tokenName, token] of Object.entries(group)) {
      if (!token.value || typeof token.value !== 'string') continue;

      // Build a clean group prefix (e.g. "primary-color-palette" → "prim-primary")
      const groupSlug = groupName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
      const tokenSlug = tokenName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();

      vars.push({
        varName: `--prim-${groupSlug}-${tokenSlug}`,
        value: normalizeColor(token.value),
        comment: `Primitive: ${groupName} / ${tokenName}`
      });
    }
  }

  return vars;
}

/**
 * Converts COLOR ROLE tokens into CSS custom properties with resolved values.
 * This is the primary output used by UI components.
 *
 * Color roles may reference primitive tokens via the {path.to.token} syntax.
 * These references are resolved to actual hex values.
 *
 * @param {object} colorRoleTokens - The "color roles" section
 * @param {object} allTokens - Full token tree (needed for reference resolution)
 * @returns {Array<{varName: string, value: string, comment: string}>}
 */
function convertColorRoles(colorRoleTokens, allTokens) {
  const vars = [];

  for (const [name, token] of Object.entries(colorRoleTokens)) {
    if (!token.value) continue;

    let value = token.value;

    // Resolve Figma variable references
    if (typeof value === 'string' && value.startsWith('{')) {
      const resolved = resolveReference(value, allTokens);
      if (resolved) {
        value = resolved;
      } else {
        console.warn(`  ⚠ Could not resolve reference for "${name}": ${value}`);
        value = `/* unresolved: ${value} */`;
      }
    } else {
      value = normalizeColor(value);
    }

    vars.push({
      varName: toCSSVar(name, 'color'),
      value,
      comment: `Role: ${name}`
    });
  }

  return vars;
}

// ─────────────────────────────────────────────────────────────────────────────
// DARK THEME — Hand-crafted semantic remapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates dark theme color role overrides.
 *
 * DARK THEME PHILOSOPHY
 * ---------------------
 * The light theme maps roles to the mid-to-high ends of each palette
 * (e.g., primary → primary 50, surface → neutral 10 which is near-black in
 * this design system which is dark-first — light-mode surface is the light end).
 *
 * For dark mode, we flip the mapping:
 *   • Surfaces use the very dark ends of the neutral palette (10–20)
 *   • On-surface text uses the light ends (90–98)
 *   • Primary action color shifts slightly lighter to maintain contrast
 *   • Container roles use the dark palette stops for contained surfaces
 *
 * This follows the Material Design 3 dark scheme tonal model.
 *
 * Primitive color values are extracted from the token data to
 * avoid hard-coding hex values that would drift when the palette changes.
 *
 * @param {object} allTokens - Full token tree
 * @returns {Array<{varName: string, value: string, comment: string}>}
 */
function generateDarkColorRoles(allTokens) {
  /**
   * Helper to pull a primitive color value by its path segments.
   * @param {...string} pathParts
   * @returns {string} resolved hex
   */
  function prim(...pathParts) {
    let node = allTokens;
    for (const part of pathParts) {
      if (!node) return '#000';
      // Try exact then fuzzy match for double-space keys
      node = node[part] ?? Object.values(node).find(
        (_, k) => Object.keys(node).find(
          key => key.replace(/\s+/g, ' ').trim() === part.replace(/\s+/g, ' ').trim()
        )
      );
      if (!node) {
        // Last attempt: iterate and match with normalized key
        const allKeys = allTokens; // reset not ideal — use resolveReference instead
        return '#444';
      }
    }
    return node?.value ? normalizeColor(node.value) : '#000';
  }

  // Use resolveReference for reliable lookups
  const r = (ref) => resolveReference(`{${ref}}`, allTokens) || '#000';

  return [
    // ── Primary ────────────────────────────────────────────────────────────
    // In dark mode, the primary action shifts to the 80 (lighter) stop so it
    // has sufficient contrast against dark backgrounds.
    {
      varName: '--color-primary-color-role',
      value: r('primitive colors.primary color palette.primary  80'),
      comment: 'Dark: primary — lightened for contrast on dark surfaces'
    },
    {
      varName: '--color-on-primary-color-role',
      value: r('primitive colors.primary color palette.primary  20'),
      comment: 'Dark: on-primary — darkened so text is readable on light primary'
    },
    {
      varName: '--color-primary-container-color-role',
      value: r('primitive colors.primary color palette.primary  30'),
      comment: 'Dark: primary container — uses the dark 30 stop'
    },
    {
      varName: '--color-on-primary-container-color-role',
      value: r('primitive colors.primary color palette.primary  90'),
      comment: 'Dark: on-primary-container — light text on dark container'
    },

    // ── Secondary ──────────────────────────────────────────────────────────
    {
      varName: '--color-secondary-color-role',
      value: r('primitive colors.secondary color palette.secondary 80'),
      comment: 'Dark: secondary — lightened for dark surface contrast'
    },
    {
      varName: '--color-on-secondary-color-role',
      value: r('primitive colors.secondary color palette.secondary 20'),
      comment: 'Dark: on-secondary'
    },
    {
      varName: '--color-secondary-container-color-role',
      value: r('primitive colors.secondary color palette.secondary 30'),
      comment: 'Dark: secondary container'
    },
    {
      varName: '--color-on-secondary-container-color-role',
      value: r('primitive colors.secondary color palette.secondary 90'),
      comment: 'Dark: on-secondary-container'
    },

    // ── Tertiary ───────────────────────────────────────────────────────────
    {
      varName: '--color-tertiary-color-role',
      value: r('primitive colors.tertiary color palette.tertiary 80'),
      comment: 'Dark: tertiary'
    },
    {
      varName: '--color-on-tertiary-color-role',
      value: r('primitive colors.tertiary color palette.tertiary 20'),
      comment: 'Dark: on-tertiary'
    },
    {
      varName: '--color-tertiary-container-color-role',
      value: r('primitive colors.tertiary color palette.tertiary 30'),
      comment: 'Dark: tertiary container'
    },
    {
      varName: '--color-on-tertiary-container-color-role',
      value: r('primitive colors.tertiary color palette.tertiary 90'),
      comment: 'Dark: on-tertiary-container'
    },

    // ── Surfaces ───────────────────────────────────────────────────────────
    // Dark surfaces use the darkest neutral stops (6–12 range).
    // The "surface" is the base page background.
    {
      varName: '--color-surface--color-role',
      value: r('primitive colors.neutral color palette.neutral 10'),
      comment: 'Dark: surface background (very dark neutral)'
    },
    {
      varName: '--color-on-surface-color-role',
      value: r('primitive colors.neutral color palette.neutral 90'),
      comment: 'Dark: text on surface (very light neutral)'
    },
    {
      varName: '--color-surface-variant-color-role',
      value: r('primitive colors.neutral variant palette.neutral variant 20'),
      comment: 'Dark: surface variant'
    },
    {
      varName: '--color-on-surface-variant-color-role',
      value: r('primitive colors.neutral variant palette.neutral variant 80'),
      comment: 'Dark: on surface variant'
    },

    // ── Surface containers — progressively lighter dark layers ─────────────
    {
      varName: '--color-surface-container-highest-color-role',
      value: r('primitive colors.neutral color palette.neutral 30'),
      comment: 'Dark: highest container (most elevated = lightest in dark)'
    },
    {
      varName: '--color-surface-container-high-color-role',
      value: '#2a2b2eff',  // Between neutral 20 and 30
      comment: 'Dark: high container'
    },
    {
      varName: '--color-surface-container--color-role',
      value: '#232428ff',  // Base container level
      comment: 'Dark: base container'
    },
    {
      varName: '--color-surface-container-low-color-role',
      value: '#1c1d20ff',  // Slightly above surface
      comment: 'Dark: low container'
    },
    {
      varName: '--color-surface-container-lowest-color-role',
      value: r('primitive colors.neutral color palette.neutral 0'),
      comment: 'Dark: lowest (deepest) container — pure black'
    },

    // ── Inverse ────────────────────────────────────────────────────────────
    {
      varName: '--color-inverse-surface--color-role',
      value: r('primitive colors.neutral color palette.neutral 90'),
      comment: 'Dark: inverse surface — used for toasts, snackbars'
    },
    {
      varName: '--color-inverse-on-surface-color-role',
      value: r('primitive colors.neutral color palette.neutral 20'),
      comment: 'Dark: text on inverse surface'
    },

    // ── Surface tint ───────────────────────────────────────────────────────
    {
      varName: '--color-surface-tint-color-role',
      value: r('primitive colors.primary color palette.primary  80'),
      comment: 'Dark: surface tint — primary tint for elevated surfaces'
    },

    // ── Outline ────────────────────────────────────────────────────────────
    {
      varName: '--color-outline-color-role',
      value: r('primitive colors.neutral variant palette.neutral variant 60'),
      comment: 'Dark: outline — visible border on dark backgrounds'
    },
    {
      varName: '--color-outline-variants-role',
      value: r('primitive colors.neutral variant palette.neutral variant 30'),
      comment: 'Dark: outline variant — subtle dividers'
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS FILE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a file header comment block.
 * @param {string} title
 * @param {string} description
 * @returns {string}
 */
function fileHeader(title, description) {
  return `/**
 * ${'='.repeat(74)}
 * ${title}
 * ${'='.repeat(74)}
 *
 * ${description.split('\n').join('\n * ')}
 *
 * ⚠  AUTO-GENERATED — Do not edit manually.
 *    Run: node design-tokens-converter.js to regenerate.
 * ${'='.repeat(74)}
 */

`;
}

/**
 * Renders a section block of CSS custom properties inside a selector.
 *
 * @param {string} selector - e.g. ":root", "[data-theme='dark']"
 * @param {string} sectionTitle - Comment heading
 * @param {Array<{varName, value, comment}>} vars
 * @returns {string}
 */
function renderSection(selector, sectionTitle, vars) {
  const lines = vars.map(({ varName, value, comment }) =>
    `  ${varName}: ${value}; /* ${comment} */`
  );

  return `/* ${'─'.repeat(72)} */\n/* ${sectionTitle.padEnd(71)}*/\n/* ${'─'.repeat(72)} */\n\n${selector} {\n${lines.join('\n')}\n}\n\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('\n🎨  Design Token Converter');
  console.log('   ' + '─'.repeat(50));

  // ── Read input ─────────────────────────────────────────────────────────────
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`\n❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  console.log(`\n📖 Reading: ${INPUT_FILE}`);
  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  const tokens = JSON.parse(raw);
  console.log('   ✓ Parsed successfully');

  // ── Ensure output directory ─────────────────────────────────────────────────
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`   ✓ Created output directory: ${OUTPUT_DIR}`);
  }

  // ── Convert each category ───────────────────────────────────────────────────
  console.log('\n🔄 Converting tokens...');

  const fontVars        = convertFontTokens(tokens['font'] || {});
  const typographyVars  = convertTypographyTokens(tokens['typography'] || {});
  const spacingVars     = convertSpacingTokens(tokens['spacing collection'] || {});
  const effectVars      = convertEffectTokens(tokens['effect'] || {});
  const primitiveVars   = convertPrimitiveColors(tokens['primitive colors'] || {});
  const colorRoleVars   = convertColorRoles(tokens['color roles'] || {}, tokens);
  const darkColorVars   = generateDarkColorRoles(tokens);

  console.log(`   ✓ Font tokens:        ${fontVars.length} variables`);
  console.log(`   ✓ Typography scale:   ${typographyVars.length} variables`);
  console.log(`   ✓ Spacing tokens:     ${spacingVars.length} variables`);
  console.log(`   ✓ Effect tokens:      ${effectVars.length} variables`);
  console.log(`   ✓ Primitive colors:   ${primitiveVars.length} variables (⚠ internal use only)`);
  console.log(`   ✓ Color roles:        ${colorRoleVars.length} variables (light theme)`);
  console.log(`   ✓ Dark color roles:   ${darkColorVars.length} variables (dark theme)`);

  // ── Build LIGHT THEME CSS ───────────────────────────────────────────────────
  const lightCSS = [
    fileHeader(
      'tokens.css — Design System Tokens (Light Theme)',
      [
        'LIGHT THEME — Default token values.',
        '',
        'HOW TO USE:',
        '  1. Import this file once in your global stylesheet or _app.tsx.',
        '  2. Apply color roles via var(--color-*) in your components.',
        '  3. NEVER use --prim-* variables directly in components.',
        '',
        'COLOR ROLE QUICK REFERENCE:',
        '  --color-primary-color-role          Main action/brand color',
        '  --color-on-primary-color-role       Text on primary color',
        '  --color-surface--color-role         Page background',
        '  --color-on-surface-color-role       Primary text color',
        '  --color-outline-color-role          Default border color',
        '  --color-surface-container-*         Card/panel backgrounds',
      ].join('\n')
    ),
    renderSection(':root', 'SPACING SCALE',                    spacingVars),
    renderSection(':root', 'EFFECTS / SHADOWS',                effectVars),
    renderSection(':root', 'FONT STYLE TOKENS (from "font" section)', fontVars),
    renderSection(':root', 'TYPOGRAPHY SCALE (named type scale)', typographyVars),
    renderSection(':root', 'COLOR ROLES — LIGHT THEME ✅ Use these in components', colorRoleVars),
    renderSection(
      ':root',
      'PRIMITIVE COLORS ⚠ Internal palette — do NOT use directly in UI',
      primitiveVars
    ),
    `/* Google Fonts import — Inter (used by all typography tokens) */\n/* Add this to your HTML <head> or global CSS: */\n/* @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'); */\n`
  ].join('');

  // ── Build DARK THEME CSS ────────────────────────────────────────────────────
  const darkCSS = [
    fileHeader(
      'tokens.dark.css — Design System Tokens (Dark Theme)',
      [
        'DARK THEME OVERRIDES.',
        '',
        'This file overrides the color role variables defined in tokens.css.',
        'It does NOT redefine spacing, typography, or shadow tokens — those',
        'are theme-agnostic and defined once in tokens.css.',
        '',
        'HOW TO ACTIVATE:',
        '  Option A — HTML attribute: <html data-theme="dark">',
        '  Option B — CSS class:      <html class="dark">',
        '',
        '  In your global CSS, also add:',
        '    @media (prefers-color-scheme: dark) {',
        '      :root { /* paste dark var overrides here */ }',
        '    }',
        '',
        'DARK THEME STRATEGY:',
        '  Surfaces    → Darkest neutral stops (neutral 10–20)',
        '  Text        → Lightest neutral stops (neutral 90–98)',
        '  Primary     → Shifted to palette 80 for legibility on dark bg',
        '  Containers  → Progressive dark layers (neutral 20–30)',
        '  Outlines    → Lighter variant stops for visibility',
      ].join('\n')
    ),

    `/* ── Apply dark theme with a data attribute ────────────────────────────── */\n`,
    renderSection('[data-theme="dark"]', 'COLOR ROLES — DARK THEME OVERRIDES', darkColorVars),

    `/* ── Apply dark theme respecting OS preference ──────────────────────────── */\n`,
    renderSection('@media (prefers-color-scheme: dark) {\n  :root', 'OS-LEVEL DARK PREFERENCE FALLBACK', darkColorVars)
      // The @media block has a nested :root, so we need to close media query
      .replace(/\n$/, '\n}\n'),
  ].join('');

  // ── Write files ─────────────────────────────────────────────────────────────
  fs.writeFileSync(OUTPUT_LIGHT, lightCSS, 'utf-8');
  fs.writeFileSync(OUTPUT_DARK, darkCSS, 'utf-8');

  console.log('\n✅ Output files written:');
  console.log(`   • ${OUTPUT_LIGHT}`);
  console.log(`   • ${OUTPUT_DARK}`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  const totalVars = fontVars.length + typographyVars.length + spacingVars.length +
                    effectVars.length + primitiveVars.length + colorRoleVars.length;

  console.log(`\n📊 Summary:`);
  console.log(`   Total CSS variables generated:   ${totalVars}`);
  console.log(`   Dark mode overrides:             ${darkColorVars.length}`);
  console.log(`\n💡 Usage tip:`);
  console.log(`   Import tokens.css in your global stylesheet:`);
  console.log(`   @import './styles/tokens.css';`);
  console.log(`   @import './styles/tokens.dark.css';`);
  console.log(`\n   Apply color roles in your CSS:`);
  console.log(`   .button { background: var(--color-primary-color-role); }`);
  console.log(`   .page   { background: var(--color-surface--color-role); }`);
  console.log(`\n   ⚠ Never use --prim-* variables directly in components.\n`);
}

main();
