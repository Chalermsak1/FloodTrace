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
        watch: {
          critical: '#991B1B', // แดงเข้ม: เฝ้าระวังสูงมาก
          high: '#DC2626',     // แดง/ส้ม: เฝ้าระวังสูง
          medium: '#D97706',   // เหลือง: ควรติดตาม
          low: '#16A34A',      // เขียว: ระดับเฝ้าระวังต่ำ
          insufficient: '#64748B', // เทา: ไม่มีข้อมูลเพียงพอ
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
        '2xs': ['0.75rem', { lineHeight: '1.4' }],    // 12px (min small label)
        'xs': ['0.8125rem', { lineHeight: '1.45' }],  // 13px (metadata)
        'sm': ['0.875rem', { lineHeight: '1.5' }],    // 14px (secondary, help, caption)
        'base': ['1rem', { lineHeight: '1.65' }],     // 16px (body, inputs, buttons)
        'lg': ['1.125rem', { lineHeight: '1.55' }],   // 18px (card headings, prominent body)
        'xl': ['1.25rem', { lineHeight: '1.45' }],    // 20px (sub-section headings)
        '2xl': ['1.5rem', { lineHeight: '1.35' }],    // 24px (section headings)
        '3xl': ['1.875rem', { lineHeight: '1.3' }],   // 30px (page headings)
        '4xl': ['2.25rem', { lineHeight: '1.25' }],   // 36px (large page headings)
        'display': ['2.75rem', { lineHeight: '1.22' }], // 44px (hero / display)
      },
      borderRadius: {
        'card': '16px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(6, 59, 112, 0.04), 0 1px 2px -1px rgba(6, 59, 112, 0.04)',
        'card': '0 4px 12px 0 rgba(6, 59, 112, 0.05)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
