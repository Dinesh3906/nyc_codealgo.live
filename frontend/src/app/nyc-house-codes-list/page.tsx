import { Metadata } from 'next';
import NYCHouseCodesListClient from './NYCHouseCodesListClient';

export const metadata: Metadata = {
  title: '#1 New York City House Codes List (2026 Updated) | PermitIQ ( by Aureon )',
  description: 'Complete 2026 New York City house codes list. Comprehensive guide to NYC residential building rules and regulations.',
};

export default function NYCHouseCodesListPage() {
  return <NYCHouseCodesListClient />;
}
