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
        // Blue and indigo follow the colour theme the employee chose; without one they are Tailwind's own colours
        blue: {
          50: 'rgb(var(--tw-blue-50, 239 246 255) / <alpha-value>)',
          100: 'rgb(var(--tw-blue-100, 219 234 254) / <alpha-value>)',
          200: 'rgb(var(--tw-blue-200, 191 219 254) / <alpha-value>)',
          300: 'rgb(var(--tw-blue-300, 147 197 253) / <alpha-value>)',
          400: 'rgb(var(--tw-blue-400, 96 165 250) / <alpha-value>)',
          500: 'rgb(var(--tw-blue-500, 59 130 246) / <alpha-value>)',
          600: 'rgb(var(--tw-blue-600, 37 99 235) / <alpha-value>)',
          700: 'rgb(var(--tw-blue-700, 29 78 216) / <alpha-value>)',
          800: 'rgb(var(--tw-blue-800, 30 64 175) / <alpha-value>)',
          900: 'rgb(var(--tw-blue-900, 30 58 138) / <alpha-value>)',
          950: 'rgb(var(--tw-blue-950, 23 37 84) / <alpha-value>)',
        },
        indigo: {
          50: 'rgb(var(--tw-indigo-50, 238 242 255) / <alpha-value>)',
          100: 'rgb(var(--tw-indigo-100, 224 231 255) / <alpha-value>)',
          200: 'rgb(var(--tw-indigo-200, 199 210 254) / <alpha-value>)',
          300: 'rgb(var(--tw-indigo-300, 165 180 252) / <alpha-value>)',
          400: 'rgb(var(--tw-indigo-400, 129 140 248) / <alpha-value>)',
          500: 'rgb(var(--tw-indigo-500, 99 102 241) / <alpha-value>)',
          600: 'rgb(var(--tw-indigo-600, 79 70 229) / <alpha-value>)',
          700: 'rgb(var(--tw-indigo-700, 67 56 202) / <alpha-value>)',
          800: 'rgb(var(--tw-indigo-800, 55 48 163) / <alpha-value>)',
          900: 'rgb(var(--tw-indigo-900, 49 46 129) / <alpha-value>)',
          950: 'rgb(var(--tw-indigo-950, 30 27 75) / <alpha-value>)',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          primary: 'rgb(var(--brand-primary-rgb, 79 70 229) / <alpha-value>)',
          'primary-hover': 'rgb(var(--brand-primary-hover-rgb, 67 56 202) / <alpha-value>)',
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
