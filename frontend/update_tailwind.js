const fs = require('fs');

const configPath = 'tailwind.config.ts';
let config = fs.readFileSync(configPath, 'utf8');

const colors = {
  "ld-on-primary-fixed-variant": "#005236",
  "ld-surface-variant": "#2d3449",
  "ld-error-container": "#93000a",
  "ld-on-tertiary-fixed": "#0b1c30",
  "ld-on-tertiary": "#213145",
  "ld-on-primary-fixed": "#002113",
  "ld-primary-fixed": "#6ffbbe",
  "ld-on-secondary-fixed-variant": "#930013",
  "ld-error": "#ffb4ab",
  "ld-surface-container-high": "#222a3d",
  "ld-tertiary-container": "#94a4bd",
  "ld-on-surface": "#dae2fd",
  "ld-secondary-fixed": "#ffdad7",
  "ld-on-primary": "#003824",
  "ld-surface-bright": "#31394d",
  "ld-outline-variant": "#3c4a42",
  "ld-on-error-container": "#ffdad6",
  "ld-surface-dim": "#0b1326",
  "ld-on-error": "#690005",
  "ld-secondary-fixed-dim": "#ffb3ad",
  "ld-on-tertiary-container": "#2a3a4f",
  "ld-on-secondary-container": "#ffaea8",
  "ld-background": "#0b1326",
  "ld-tertiary": "#b7c8e1",
  "ld-tertiary-fixed": "#d3e4fe",
  "ld-tertiary-fixed-dim": "#b7c8e1",
  "ld-surface-container-low": "#131b2e",
  "ld-surface-container-highest": "#2d3449",
  "ld-surface-tint": "#4edea3",
  "ld-inverse-surface": "#dae2fd",
  "ld-inverse-primary": "#006c49",
  "ld-on-secondary-fixed": "#410004",
  "ld-primary-fixed-dim": "#4edea3",
  "ld-on-tertiary-fixed-variant": "#38485d",
  "ld-inverse-on-surface": "#283044",
  "ld-surface-container": "#171f33",
  "ld-secondary-container": "#a40217",
  "ld-primary-container": "#10b981",
  "ld-on-secondary": "#68000a",
  "ld-on-background": "#dae2fd",
  "ld-secondary": "#ffb3ad",
  "ld-surface": "#0b1326",
  "ld-on-primary-container": "#00422b",
  "ld-surface-container-lowest": "#060e20",
  "ld-outline": "#86948a",
  "ld-primary": "#4edea3",
  "ld-on-surface-variant": "#bbcabf"
};

const fontFamilies = {
  "ld-body-lg": '["JetBrains Mono", "monospace"]',
  "ld-headline-lg": '["Space Grotesk", "sans-serif"]',
  "ld-display-hero": '["Space Grotesk", "sans-serif"]',
  "ld-body-md": '["JetBrains Mono", "monospace"]',
  "ld-label-caps": '["Space Mono", "monospace"]',
  "ld-headline-md": '["Space Grotesk", "sans-serif"]',
  "ld-headline-lg-mobile": '["Space Grotesk", "sans-serif"]',
  "ld-code-sm": '["Space Mono", "monospace"]'
};

const fontSizes = {
  "ld-display-hero": '["4rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }]',
  "ld-headline-lg": '["3rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }]',
  "ld-headline-lg-mobile": '["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }]',
  "ld-headline-md": '["1.5rem", { lineHeight: "1.3" }]',
  "ld-body-lg": '["1.125rem", { lineHeight: "1.6" }]',
  "ld-body-md": '["1rem", { lineHeight: "1.5" }]',
  "ld-label-caps": '["0.875rem", { lineHeight: "1.2", letterSpacing: "0.1em" }]',
  "ld-code-sm": '["0.75rem", { lineHeight: "1.4" }]'
};

const spacing = {
  "ld-stack-sm": '"12px"',
  "ld-container-max": '"1280px"',
  "ld-margin-desktop": '"64px"',
  "ld-gutter": '"24px"',
  "ld-stack-md": '"24px"',
  "ld-base": '"8px"',
  "ld-stack-lg": '"48px"',
  "ld-margin-mobile": '"16px"'
};

// Add properties by replacing inside extend blocks
function addBlock(cfg, blockName, obj) {
    const lines = Object.entries(obj).map(([k, v]) => `        "${k}": ${typeof v === 'string' && !v.startsWith('[') && !v.startsWith('"') ? `"${v}"` : v},`).join('\n');
    
    // Find the end of the block inside extend
    if (cfg.includes(`      ${blockName}: {`)) {
        return cfg.replace(new RegExp(`(      ${blockName}: \\{)([\\s\\S]*?)(\\})`), (match, p1, p2, p3) => {
            return `${p1}\n${lines}${p2}${p3}`;
        });
    } else {
        // If block doesn't exist, add it inside extend: {
        return cfg.replace(/(extend: \{)/, `$1\n      ${blockName}: {\n${lines}\n      },`);
    }
}

config = addBlock(config, 'colors', colors);
config = addBlock(config, 'fontFamily', fontFamilies);
config = addBlock(config, 'fontSize', fontSizes);
config = addBlock(config, 'spacing', spacing);

fs.writeFileSync(configPath, config);
console.log('Updated tailwind.config.ts');
