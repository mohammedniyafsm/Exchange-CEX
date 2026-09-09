/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#08090b',
        panel: '#0d0f12',
        panelAlt: '#111419',
        border: '#24282e',
        text: '#f5f5f5',
        muted: '#8b929c',
        subtle: '#5f6670',
        buy: '#1ad5a4',
        sell: '#f55f72',
        primary: '#2c7bf6',
        warning: '#f5b336'
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(36,40,46,0.8)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
}
