import type { Metadata } from 'next';

// Любимите оферти са лични за всеки посетител (пазят се в браузъра) — няма смисъл да са в Google.
export const metadata: Metadata = {
  title: 'Любими оферти',
  robots: { index: false, follow: true },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
