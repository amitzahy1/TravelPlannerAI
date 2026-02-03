/** @type {import('tailwindcss').Config} */
export default {
        content: [
                "./index.html",
                "./src/**/*.{js,ts,jsx,tsx}",
                "./src/**/*.{js,ts,jsx,tsx}",
                "./components/**/*.{js,ts,jsx,tsx}", // Just in case components are outside src
                "./utils/**/*.{js,ts,jsx,tsx}",   // Add utils to scan for dynamic classes in cityColors.ts

        ],
        theme: {
                extend: {
                        fontFamily: {
                                'rubik': ['Rubik', 'sans-serif'],
                                'outfit': ['Outfit', 'sans-serif'],
                                'heebo': ['Heebo', 'sans-serif'],
                        },
                        animation: {
                                'fade-in': 'fadeIn 0.4s ease-out forwards',
                                'scale-in': 'scaleIn 0.3s ease-out forwards',
                        },
                        keyframes: {
                                fadeIn: {
                                        '0%': { opacity: '0', transform: 'translateY(10px)' },
                                        '100%': { opacity: '1', transform: 'translateY(0)' },
                                },
                                scaleIn: {
                                        '0%': { opacity: '0', transform: 'scale(0.95)' },
                                        '100%': { opacity: '1', transform: 'scale(1)' },
                                }
                        }
                },
        },
        plugins: [],
}
