/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
        colors: {
            fondo: "#F8F9FA",
            texto: "#191919",
            primario: "#8B5CF6",
            secundario: "#1A73E8",
            terciario: "#F44336",
        },
        borderRadius: {
            'flexver': '8px',
        }
        },
    },
    plugins: [],
}