import Link from 'next/link';

export default function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="breadcrumb" className="not-prose mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-border">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-primary transition-colors">{item.label}</Link>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[300px]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
