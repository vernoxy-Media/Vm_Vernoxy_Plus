/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        xs:   ['0.75rem',   { lineHeight: '1rem'     }],  // 12px
        sm:   ['0.875rem',  { lineHeight: '1.25rem'  }],  // 14px
        base: ['1rem',      { lineHeight: '1.5rem'   }],  // 16px
        lg:   ['1.125rem',  { lineHeight: '1.75rem'  }],  // 18px
        xl:   ['1.25rem',   { lineHeight: '1.75rem'  }],  // 20px
        '2xl': ['1.5rem',   { lineHeight: '2rem'     }],  // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem'  }],  // 30px
        '4xl': ['2.25rem',  { lineHeight: '2.5rem'   }],  // 36px
      },
      maxWidth: {
        'page-wide': '90rem',
        'page-form': '60rem',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          primary: '#4F46E5',
          'primary-hover': '#4338CA',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#EF4444',
          bg: '#F6F8FB',
          surface: '#FFFFFF',
          border: '#E8EDF5',
          text: '#0F172A',
          muted: '#64748B',
        },
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
      boxShadow: {
        'card-subtle': '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)',
        'card-hero': '0 12px 32px rgba(79, 70, 229, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
        'card-pill': '0 4px 14px rgba(79, 70, 229, 0.3)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '"SF Pro Display"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      },
    },
  },
  plugins: [
    // `outline-hidden` (Tailwind 4 name) is used across the UI; give Tailwind 3 the same utility
    function ({ addUtilities }) {
      addUtilities({
        '.outline-hidden': { outline: '2px solid transparent', 'outline-offset': '2px' },
        // Tailwind 4 name, used by every modal backdrop in the app
        '.backdrop-blur-xs': { '-webkit-backdrop-filter': 'blur(4px)', 'backdrop-filter': 'blur(4px)' },
      });
    },
  ],
};
