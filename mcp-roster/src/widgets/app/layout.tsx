'use client';

import { WidgetLayout } from '@nitrostack/widgets';

/**
 * Used by `next dev` only. The production bundle is built by
 * `nitrostack-cli build`, which esbuilds every `page.tsx` under `app/` into its
 * own self-contained `out/<name>.html` and never reads this file — so a panel
 * page must not rely on anything provided here.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
