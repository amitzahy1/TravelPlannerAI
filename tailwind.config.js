/** @type {import('tailwindcss').Config} */
export default {
        content: [
                "./index.html",
                "./src/**/*.{js,ts,jsx,tsx}",

                "./components/**/*.{js,ts,jsx,tsx}", // Just in case components are outside src
                "./utils/**/*.{js,ts,jsx,tsx}",   // Add utils to scan for dynamic classes in cityColors.ts

        ],
        theme: {
                extend: {
                        fontFamily: {
                                'rubik':  ['Rubik', 'sans-serif'],
                                'nunito': ['Nunito', 'sans-serif'],
                                'outfit': ['Outfit', 'sans-serif'],
                                'heebo': ['Heebo', 'sans-serif'],
                        },
                        // ─ Design tokens (see utils/designTokens.ts) ─
                        // Additive only: extends Tailwind defaults without
                        // overriding existing class semantics. Canonical ramp
                        // for new code: text-2xs, text-xs, text-sm, text-base,
                        // text-md, text-lg, text-xl, text-2xl, text-3xl.
                        fontSize: {
                                '2xs': ['11px', { lineHeight: '1.3' }],
                                'md':  ['16px', { lineHeight: '1.5' }],
                        },
                        borderRadius: {
                                'pill': '9999px',
                        },
                        boxShadow: {
                                'card':       '0 1px 2px rgba(15,23,42,0.05)',
                                'card-hover': '0 4px 12px rgba(15,23,42,0.08)',
                                'popover':    '0 16px 48px rgba(15,23,42,0.18)',
                        },
                        colors: {
                                // "Material You" Brand Colors
                                brand: {
                                        navy: '#0f172a', // Deep Slate
                                        action: '#2563eb', // Google Blue
                                        surface: '#ffffff',
                                },
                                // Semantic Glass Colors
                                glass: {
                                        light: 'rgba(255, 255, 255, 0.65)',
                                        dark: 'rgba(15, 23, 42, 0.75)',
                                        border: 'rgba(255, 255, 255, 0.3)',
                                },
                                surface: {
                                        primary: '#f8fafc',
                                        elevated: '#ffffff',
                                        muted: '#f1f5f9',
                                },
                                accent: {
                                        aurora: '#667eea',
                                        sunset: '#fa709a',
                                        ocean: '#4facfe',
                                        forest: '#11998e',
                                },
                        },
                        animation: {
                                'fade-in': 'fadeIn 0.4s ease-out forwards',
                                'fade-in-up': 'fadeInUp 0.5s ease-out forwards', // Material Standard
                                'scale-in': 'scaleIn 0.3s ease-out forwards',
                                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                                'float': 'float 6s ease-in-out infinite',
                                'skeleton': 'skeleton 1.4s ease-in-out infinite',
                        },
                        keyframes: {
                                skeleton: {
                                        '0%': { backgroundPosition: '200% 50%' },
                                        '100%': { backgroundPosition: '-200% 50%' },
                                },
                                fadeInUp: {
                                        '0%': { opacity: '0', transform: 'translateY(15px)' },
                                        '100%': { opacity: '1', transform: 'translateY(0)' },
                                },
                                fadeIn: {
                                        '0%': { opacity: '0', transform: 'translateY(10px)' },
                                        '100%': { opacity: '1', transform: 'translateY(0)' },
                                },
                                scaleIn: {
                                        '0%': { opacity: '0', transform: 'scale(0.95)' },
                                        '100%': { opacity: '1', transform: 'scale(1)' },
                                },
                                slideUp: {
                                        '0%': { opacity: '0', transform: 'translateY(20px)' },
                                        '100%': { opacity: '1', transform: 'translateY(0)' },
                                },
                                float: {
                                        '0%, 100%': { transform: 'translateY(0)' },
                                        '50%': { transform: 'translateY(-10px)' },
                                },
                        }
                },
        },
        plugins: [],
}
