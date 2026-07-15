import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import dts from 'unplugin-dts/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      isLib && dts({
        tsconfigPath: './tsconfig.lib.json',
      }),
      mdx({
        remarkPlugins: [remarkGfm]
      }),
    ],
    base: './',
    publicDir: isLib ? false : undefined,
    build: isLib ? {
      lib: {
        entry: 'src/DataGrid/index.ts',
        fileName: 'index',
        formats: ['es'],
      },
      rolldownOptions: {
        external: Object.keys(pkg.dependencies)
      }
    } : undefined
  }
})
