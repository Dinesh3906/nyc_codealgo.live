const fs = require('fs');

const jsx = fs.readFileSync('output.tsx', 'utf8');

const content = `
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-ld-background min-h-screen text-ld-on-surface selection:bg-ld-primary selection:text-ld-on-primary">
      ${jsx}
    </div>
  );
}
`;

fs.writeFileSync('src/app/page.tsx', content);
console.log('Updated page.tsx');
