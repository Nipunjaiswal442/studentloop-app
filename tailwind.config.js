/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // hover: styles only on devices that can hover, so taps on phones don't leave them stuck on.
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        subtle: 'hsl(var(--subtle) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        control: 'hsl(var(--control) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          hover: 'hsl(var(--primary-hover) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          soft: 'hsl(var(--primary-soft) / <alpha-value>)',
          'soft-foreground': 'hsl(var(--primary-soft-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          soft: 'hsl(var(--success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          soft: 'hsl(var(--warning-soft) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          soft: 'hsl(var(--danger-soft) / <alpha-value>)',
        },
      },
      boxShadow: {
        card: '0 1px 2px hsl(var(--shadow) / 0.06)',
        raised: '0 8px 24px -8px hsl(var(--shadow) / 0.18)',
      },
      // Motion only moves transform and opacity. Entrances fill "backwards" so
      // once they finish the element's own transform (hover lift, press) applies.
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translate3d(0, 1rem, 0)' } },
        enter: { from: { opacity: '0', transform: 'translate3d(0, 0.375rem, 0)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.6)' } },
        pop: {
          '0%, 100%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.2)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(6%, 5%, 0) scale(1.08)' },
          '100%': { transform: 'translate3d(-5%, 9%, 0) scale(0.95)' },
        },
      },
      animation: {
        rise: 'rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        enter: 'enter 0.22s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'pop-in': 'pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
        pop: 'pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        drift: 'drift 26s ease-in-out infinite alternate',
        'drift-slow': 'drift 34s ease-in-out -12s infinite alternate-reverse',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
