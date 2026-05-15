const fs = require('fs');

let html = fs.readFileSync('input.html', 'utf8');

// Replace colors
const colors = [
    "on-primary-fixed-variant", "surface-variant", "error-container", "on-tertiary-fixed", "on-tertiary", "on-primary-fixed", "primary-fixed", "on-secondary-fixed-variant", "error", "surface-container-high", "tertiary-container", "on-surface", "secondary-fixed", "on-primary", "surface-bright", "outline-variant", "on-error-container", "surface-dim", "on-error", "secondary-fixed-dim", "on-tertiary-container", "on-secondary-container", "background", "tertiary", "tertiary-fixed", "tertiary-fixed-dim", "surface-container-low", "surface-container-highest", "surface-tint", "inverse-surface", "inverse-primary", "on-secondary-fixed", "primary-fixed-dim", "on-tertiary-fixed-variant", "inverse-on-surface", "surface-container", "secondary-container", "primary-container", "on-secondary", "on-background", "secondary", "surface", "on-primary-container", "surface-container-lowest", "outline", "primary", "on-surface-variant"
];

const fonts = [
    "body-lg", "headline-lg", "display-hero", "body-md", "label-caps", "headline-md", "headline-lg-mobile", "code-sm"
];

const spacing = [
    "stack-sm", "container-max", "margin-desktop", "gutter", "stack-md", "base", "stack-lg", "margin-mobile"
];

// Helper to replace word boundaries with negative lookbehind to avoid replacing e.g., 'bg-primary' if it's already 'bg-ld-primary'
function replaceClass(prefix, item, newPrefix) {
    const regex = new RegExp(`(?<!ld-)${prefix}${item}`, 'g');
    html = html.replace(regex, `${prefix}${newPrefix}${item}`);
}

colors.forEach(c => {
    replaceClass('bg-', c, 'ld-');
    replaceClass('text-', c, 'ld-');
    replaceClass('border-', c, 'ld-');
    replaceClass('ring-', c, 'ld-');
    replaceClass('selection:bg-', c, 'ld-');
    replaceClass('selection:text-', c, 'ld-');
});

fonts.forEach(f => {
    replaceClass('font-', f, 'ld-');
    replaceClass('text-', f, 'ld-');
});

spacing.forEach(s => {
    replaceClass('p-', s, 'ld-');
    replaceClass('px-', s, 'ld-');
    replaceClass('py-', s, 'ld-');
    replaceClass('pt-', s, 'ld-');
    replaceClass('pb-', s, 'ld-');
    replaceClass('pl-', s, 'ld-');
    replaceClass('pr-', s, 'ld-');
    replaceClass('m-', s, 'ld-');
    replaceClass('mx-', s, 'ld-');
    replaceClass('my-', s, 'ld-');
    replaceClass('mt-', s, 'ld-');
    replaceClass('mb-', s, 'ld-');
    replaceClass('ml-', s, 'ld-');
    replaceClass('mr-', s, 'ld-');
    replaceClass('gap-', s, 'ld-');
    replaceClass('w-', s, 'ld-');
    replaceClass('h-', s, 'ld-');
    replaceClass('max-w-', s, 'ld-');
});

// React specific conversions
html = html.replace(/class="/g, 'className="');
html = html.replace(/for="/g, 'htmlFor="');
html = html.replace(/<!--(.*?)-->/g, '{/* $1 */}');
html = html.replace(/style="([^"]*)"/g, (match, p1) => {
    // Basic style conversion for style="font-variation-settings: 'FILL' 1;"
    if (p1.includes("font-variation-settings")) {
        return `style={{ fontVariationSettings: "'FILL' 1" }}`;
    }
    return match;
});

// Remove <br> and replace with <br/>
html = html.replace(/<br>/g, '<br/>');

fs.writeFileSync('output.tsx', html);
console.log('Done');
