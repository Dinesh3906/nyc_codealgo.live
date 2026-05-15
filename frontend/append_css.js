const fs = require('fs');

const customCSS = `
/* Custom CSS from new design */
.cyber-grid {
    background-image: 
        linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 40px 40px;
}
.glow-text-ld-primary {
    text-shadow: 0 0 20px rgba(78,222,163,0.3);
}
.glow-text-ld-secondary {
    text-shadow: 0 0 20px rgba(255,179,173,0.3);
}
.glass-card {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
}
.glass-card-glow {
    box-shadow: 0 0 20px rgba(78, 222, 163, 0.1);
}
.glass-card-glow-active {
    box-shadow: 0 0 30px rgba(78, 222, 163, 0.3);
    border-color: rgba(78, 222, 163, 0.3);
}
.corner-brackets::before, .corner-brackets::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-color: rgba(255, 255, 255, 0.2);
    border-style: solid;
}
.corner-brackets::before {
    top: 0;
    left: 0;
    border-width: 1px 0 0 1px;
}
.corner-brackets::after {
    bottom: 0;
    right: 0;
    border-width: 0 1px 1px 0;
}
.btn-cyber {
    position: relative;
}
.btn-cyber::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    right: -4px;
    bottom: -4px;
    border: 1px solid rgba(78,222,163,0.3);
    z-index: -1;
    transition: all 0.2s ease;
}
.btn-cyber:hover::after {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0;
}
`;

fs.appendFileSync('src/app/globals.css', customCSS);
console.log('Updated globals.css');
