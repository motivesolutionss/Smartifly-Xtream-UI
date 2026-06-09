import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'webos-non-module-output',
      closeBundle() {
        const indexPath = join(process.cwd(), 'dist', 'index.html');
        const html = readFileSync(indexPath, 'utf8');
        const distDir = join(process.cwd(), 'dist');
        const vendorDir = join(distDir, 'vendor');

        try {
          mkdirSync(vendorDir, { recursive: true });
          copyFileSync(
            join(process.cwd(), 'node_modules', 'hls.js', 'dist', 'hls.min.js'),
            join(vendorDir, 'hls.min.js')
          );
          copyFileSync(
            join(process.cwd(), 'node_modules', 'shaka-player', 'dist', 'shaka-player.compiled.js'),
            join(vendorDir, 'shaka-player.compiled.js')
          );
        } catch (e) {
          console.error('Failed to copy vendor player bundles:', e);
        }

        // Inline the CSS file content to avoid webOS CORS file:// blocks
        const cssPath = join(process.cwd(), 'dist', 'styles.css');
        let cssInlineTag = '';
        if (existsSync(cssPath)) {
          const cssContent = readFileSync(cssPath, 'utf8');
          cssInlineTag = `<style>${cssContent}</style>`;
          try {
            unlinkSync(cssPath);
          } catch (e) {
            console.error('Failed to delete dist/styles.css:', e);
          }
        }

        const htmlWithInlinedCss = html
          .replace('<link rel="stylesheet" crossorigin href="./styles.css">', cssInlineTag);

        const withoutAppScript = htmlWithInlinedCss
          .replace(/\s*<script type="module" crossorigin src="\.\/app\.js"><\/script>/, '')
          .replace(/\s*<script src="\.\/app\.js"><\/script>/, '');

        const lineEnding = html.includes('\r\n') ? '\r\n' : '\n';

        const loaderSnippet = [
          "        setStatus('HTML loaded. Installing global error handlers...');",
          "        window.addEventListener('error', function (event) {",
          "          setStatus('A runtime error blocked rendering.');",
          "          appendLog('window.error', event.error || event.message || 'Unknown error');",
          "          showErrorPanel();",
          '        });',
          "        window.addEventListener('unhandledrejection', function (event) {",
          "          setStatus('An unhandled promise rejection blocked rendering.');",
          "          appendLog('window.unhandledrejection', event.reason || 'Unknown rejection');",
          "          showErrorPanel();",
          '        });',
          '',
          "        setStatus('Global handlers ready. Loading app.js...');",
          "        function loadScript(src, onload, onerrorLabel) {",
          "          var script = document.createElement('script');",
          "          script.src = src;",
          '          script.async = false;',
          '          script.onload = onload;',
          "          script.onerror = function () {",
          '            setStatus("Failed to load " + src);',
          "            appendLog('script.onerror', onerrorLabel || ('The emulator could not load ' + src));",
          '          };',
          '          document.body.appendChild(script);',
          '        }',
          "        function loadAppBundle() {",
          "          var bundleScript = document.createElement('script');",
          "          bundleScript.src = './app.js';",
          '          bundleScript.async = false;',
          "          bundleScript.onload = function () {",
          "            setStatus('app.js loaded successfully. Waiting for startup logs...');",
          '          };',
          "          bundleScript.onerror = function () {",
          "            setStatus('Failed to load app.js');",
          "            appendLog('script.onerror', 'The emulator could not load ./app.js');",
          '          };',
          '          document.body.appendChild(bundleScript);',
          '        };',
          "        setStatus('Loading vendor player bundles...');",
          "        loadScript('./vendor/hls.min.js', function () {",
          "          setStatus('hls.js loaded. Loading Shaka...');",
          "          loadScript('./vendor/shaka-player.compiled.js', function () {",
          "            setStatus('Shaka loaded. Loading app.js...');",
          '            loadAppBundle();',
          "          }, 'The emulator could not load ./vendor/shaka-player.compiled.js');",
          "        }, 'The emulator could not load ./vendor/hls.min.js');"
        ].join(lineEnding);

        const patched = withoutAppScript.replace(
          [
            "        setStatus('HTML loaded. Installing global error handlers...');",
            "        window.addEventListener('error', function (event) {",
            "          setStatus('A runtime error blocked rendering.');",
            "          appendLog('window.error', event.error || event.message || 'Unknown error');",
            "          showErrorPanel();",
            "        });",
            "        window.addEventListener('unhandledrejection', function (event) {",
            "          setStatus('An unhandled promise rejection blocked rendering.');",
            "          appendLog('window.unhandledrejection', event.reason || 'Unknown rejection');",
            "          showErrorPanel();",
            "        });"
          ].join(lineEnding),
          loaderSnippet
        );

        if (patched !== html) {
          writeFileSync(indexPath, patched, 'utf8');
        }
      }
    }
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2017',
    minify: 'esbuild',
    cssMinify: true,
    cssCodeSplit: false,
    sourcemap: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'SmartiflyLGApp',
        entryFileNames: 'app.js',
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles.css';
          }

          return 'assets/[name][extname]';
        }
      }
    }
  }
});
