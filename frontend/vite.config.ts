import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['test/unit/**/*.{test,spec}.{js,ts,jsx,tsx}'],
        setupFiles: './test/setup.ts',
    },
    coverage: {
        provider: 'c8',
        reporter: ['text', 'lcov'],
        exclude: [...configDefaults.coverage.exclude, 'test/setup.ts'],
    },
})
