import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

export default defineConfig({
    plugins: [
        electron({
            main: {
                entry: 'src/main/index.ts',
            },
            preload: {
                input: path.join(__dirname, 'src/preload/index.ts'),
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
})
