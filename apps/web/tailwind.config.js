/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // FloodTrace Unified Environmental Intelligence System
        ft: {
          navy: '#0A2540',
          'navy-dark': '#06182A',
          'navy-light': '#1E3A8A',
          blue: '#0284C7',
          'blue-dark': '#0369A1',
          'blue-light': '#38BDF8',
          'blue-subtle': '#F0F9FF',
          cyan: '#06B6D4',
          'cyan-subtle': '#ECFEFF',
          purple: '#7C3AED',
          'purple-dark': '#6D28D9',
          'purple-subtle': '#F5F3FF',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          'border-subtle': '#F1F5F9',
          muted: '#64748B',
          text: '#0F172A',
        },
        // Backward-compatible tokens
        ruwaigon: {
          navy: '#063B70',
          'navy-dark': '#04274B',
          blue: '#0C65E8',
          'blue-light': '#3B82F6',
          'blue-subtle': '#EFF6FF',
          bg: '#F5F8FC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#64748B',
          dark: '#073967',
        },
        // Semantic Hydrological & Verification Statuses
        status: {
          critical: '#DC2626',
          'critical-bg': '#FEF2F2',
          'critical-border': '#FECACA',
          watch: '#D97706',
          'watch-bg': '#FFFBEB',
          'watch-border': '#FDE68A',
          normal: '#059669',
          'normal-bg': '#ECFDF5',
          'normal-border': '#A7F3D0',
          unmonitored: '#0284C7',
          'unmonitored-bg': '#F0F9FF',
          'unmonitored-border': '#BAE6FD',
          stale: '#64748B',
          'stale-bg': '#F8FAFC',
          'stale-border': '#CBD5E1',
        },
        watch: {
          critical: '#991B1B',
          high: '#DC2626',
          medium: '#D97706',
          low: '#16A34A',
          insufficient: '#64748B',
        },
        hazard: {
          low: '#16A34A',
          medium: '#D97706',
          high: '#EA580C',
          critical: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans Thai"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        '3xs': ['0.75rem', { lineHeight: '1.45' }],     // 12px minimum floor
        '2xs': ['0.75rem', { lineHeight: '1.45' }],     // 12px minimum floor
        'xs': ['0.75rem', { lineHeight: '1.45' }],      // 12px - Small metadata, badges, timestamps
        'sm': ['0.875rem', { lineHeight: '1.5' }],      // 14px - Supporting text, secondary labels
        'base': ['1rem', { lineHeight: '1.6' }],        // 16px - Standard readable body text, inputs
        'lg': ['1.125rem', { lineHeight: '1.5' }],      // 18px - Card headings, emphasized body
        'xl': ['1.25rem', { lineHeight: '1.4' }],       // 20px - Sub-section headings
        '2xl': ['1.5rem', { lineHeight: '1.35' }],      // 24px - Section headings / Mobile page title
        '3xl': ['1.875rem', { lineHeight: '1.3' }],     // 30px - Desktop page title (28-32px)
        '4xl': ['2.25rem', { lineHeight: '1.25' }],     // 36px - Hero / Large display
        'display': ['2.75rem', { lineHeight: '1.2' }],  // 44px - Display headline
      },
      borderRadius: {
        'card': '14px',
        'panel': '16px',
        'pill': '9999px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'elevated': '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'modal': '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
