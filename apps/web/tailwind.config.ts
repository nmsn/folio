import type { Config } from 'tailwindcss';
import sharedConfig from '@folio/tailwindcss/theme.json';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    ...sharedConfig,
    extend: {
      ...sharedConfig.theme?.extend,
      colors: {
        ...(sharedConfig.theme?.extend?.colors as Record<string, string> | undefined),
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          foreground: 'hsl(var(--muted-foreground))',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;