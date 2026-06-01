export interface Author {
  name: string;
  role: string;
  bio: string;
  credentials: string[];
  avatar: string;
  linkedin: string;
}

export const authors: Record<string, Author> = {
  'codealgo-team': {
    name: 'CodeAlgo Editorial Team',
    role: 'NYC Building Code Specialists',
    bio: 'The CodeAlgo team includes licensed architects, registered engineers, and NYC permit expediters with combined 20+ years of DOB filing experience across all five boroughs.',
    credentials: [
      'Verified against NYC DOB Code Library',
      'Updated for 2026 Existing Building Code',
      'Reviewed by Licensed Professionals'
    ],
    avatar: '/authors/codealgo-team.jpg',
    linkedin: 'https://linkedin.com/company/codealgo',
  }
};
