/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* ── Typography scale ─────────────────────────────────
       * Minimum readable size: 14px (0.875rem).
       * "text-xs" is the smallest class allowed for user-readable text.
       * All values use rem so they respect user / OS font-size prefs.
       */
      fontSize: {
        xs:   ['0.875rem',  { lineHeight: '1.25rem'  }],  // 14px – smallest readable
        sm:   ['0.9375rem', { lineHeight: '1.375rem' }],  // 15px – secondary / helpers
        base: ['1rem',      { lineHeight: '1.5rem'   }],  // 16px – body default
        lg:   ['1.125rem',  { lineHeight: '1.75rem'  }],  // 18px
        xl:   ['1.25rem',   { lineHeight: '1.75rem'  }],  // 20px
        '2xl': ['1.5rem',   { lineHeight: '2rem'     }],  // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem'  }],  // 30px
        '4xl': ['2.25rem',  { lineHeight: '2.5rem'   }],  // 36px
      },
      /* ── Layout widths ──────────────────────────────────
       * maxWidth tokens used by AppLayout for centering content.
       */
      maxWidth: {
        'page-wide': '90rem',   // 1440px – data pages / tables
        'page-form': '60rem',   // 960px  – forms / settings
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
