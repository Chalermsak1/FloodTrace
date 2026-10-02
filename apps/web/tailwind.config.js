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
        sans: ['Sarabun', 'Noto Sans Thai', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
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
