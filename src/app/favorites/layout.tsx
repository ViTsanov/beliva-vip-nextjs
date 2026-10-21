import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/shareMeta';

// Любимите оферти и дестинации са лични за всеки посетител (пазят се в браузъра) — няма смисъл да са в Google.
export const metadata: Metadata = {
  title: 'Любими',
  robots: { index: false, follow: true },
  ...shareMetadata({
    path: '/favorites',
    title: 'Любими | Beliva VIP Tour',
    description: 'Екскурзиите, които сте отбелязали със сърце в Beliva VIP Tour.',
  }),
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
