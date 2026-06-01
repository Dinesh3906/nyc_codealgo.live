import { Author } from '@/lib/authors';

export default function AuthorCard({ author, lastUpdated }: { author: Author; lastUpdated: string }) {
  return (
    <div className="flex flex-col gap-4 p-6 bg-muted/50 border border-border rounded-2xl mb-10 not-prose">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          CA
        </div>
        <div>
          <p className="font-bold text-foreground text-base">{author.name}</p>
          <p className="text-sm text-muted-foreground">{author.role}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{author.bio}</p>
      <div className="flex flex-wrap gap-2">
        {author.credentials.map((credential, idx) => (
          <span key={idx} className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            {credential}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
        <span>Last updated: <time dateTime={lastUpdated}>{new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time></span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Content verified against NYC DOB 2026 standards</span>
      </div>
    </div>
  );
}
