import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        watch: {
            ignored: ['!**/*.wgsl'], // Watch wgsl files
        },
    },
    plugins: [
        {
            name: 'wgsl-hot-reload',
            handleHotUpdate({ file, server }) {
                if (file.endsWith('.wgsl')) {
                    console.log(`[HMR] Reloading due to .wgsl file change: ${file}`);
                    server.ws.send({ type: 'full-reload' }); // Triggers a full page reload
                }
            },
        },
    ],
});