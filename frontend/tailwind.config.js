/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#060911',
          900: '#0B0F19',
          800: '#111827',
          700: '#1E293B',
          600: '#334155',
        },
        orbit: {
          primary: '#0284C7',
          light: '#0EA5E9',
          glow: 'rgba(14, 165, 233, 0.15)',
        },
        telemetry: {
          border: '#E2E8F0',
          darkborder: '#1E293B',
          muted: '#64748B',
          light: '#F8FAFC',
        },
        optical: {
          emerald: '#10B981',
          emeraldGlow: 'rgba(16, 185, 129, 0.15)',
        },
        cloud: {
          amber: '#F59E0B',
          amberGlow: 'rgba(245, 158, 11, 0.15)',
        },
        obscured: {
          crimson: '#EF4444',
          crimsonGlow: 'rgba(239, 68, 68, 0.15)',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
