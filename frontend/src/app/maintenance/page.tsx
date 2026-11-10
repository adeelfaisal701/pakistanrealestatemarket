import type { Metadata } from 'next';
import MaintenanceLandingPage from '@/components/maintenance/MaintenanceLandingPage';

export const metadata: Metadata = {
  title: 'Home Maintenance Services | Ghar Safar',
  description:
    'Book trusted plumbers, electricians, AC technicians, carpenters, painters and home maintenance professionals in Lahore.',
};

export default function MaintenancePage() {
  return <MaintenanceLandingPage />;
}
