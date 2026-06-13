import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { transformSync } from '@babel/core';

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
        const cacheBust = Date.now().toString();

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

        // Remove any source entry scripts or generated script tags for app.js
        const withoutAppScript = htmlWithInlinedCss
          .replace(/\s*<script type="module" src="\/src\/main\.tsx"><\/script>/g, '')
          .replace(/\s*<script type="module" src="src\/main\.tsx"><\/script>/g, '')
          .replace(/\s*<script type="module" crossorigin src="\.\/app\.js"><\/script>/g, '')
          .replace(/\s*<script src="\.\/app\.js"><\/script>/g, '');

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
          "        setStatus('Loading polyfills...');",
          `        loadScript('./vendor/polyfills.js?v=${cacheBust}', function () {`,
          "          setStatus('Loading vendor player bundles...');",
          `          loadScript('./vendor/hls.min.js?v=${cacheBust}', function () {`,
          "            setStatus('hls.js loaded. Loading Shaka...');",
          `            loadScript('./vendor/shaka-player.compiled.js?v=${cacheBust}', function () {`,
          "              setStatus('Shaka loaded. Loading app.js...');",
          '              loadAppBundle();',
          `            }, 'The emulator could not load ./vendor/shaka-player.compiled.js?v=${cacheBust}');`,
          `          }, 'The emulator could not load ./vendor/hls.min.js?v=${cacheBust}');`,
          `        }, 'The emulator could not load ./vendor/polyfills.js?v=${cacheBust}');`
        ].join(lineEnding);

        // Replace the error handler block with the full loader block using RegExp
        const patched = withoutAppScript.replace(
          /\s*setStatus\(\s*['"]HTML loaded\. Installing global error handlers\.\.\.['"]\s*\);[\s\S]*?window\.addEventListener\(['"]unhandledrejection['"][\s\S]*?showErrorPanel\(\);\s*\}\);/,
          lineEnding + loaderSnippet
        );

        if (patched !== html) {
          writeFileSync(indexPath, patched, 'utf8');
        }

        // Transpile app.js to ES5 and prepend polyfills for webOS 3.0
        const appJsPath = join(process.cwd(), 'dist', 'app.js');
        if (existsSync(appJsPath)) {
          console.log('Post-processing app.js: transpiling to ES5 (chrome 38) and prepending polyfills...');
          try {
            const rawAppJs = readFileSync(appJsPath, 'utf8');
            const babelResult = transformSync(rawAppJs, {
              presets: [
                ['@babel/preset-env', {
                  targets: { chrome: '38' },
                  useBuiltIns: false,
                  modules: false
                }]
              ],
              compact: true,
              minified: true,
              configFile: false,
              babelrc: false
            });

            if (!babelResult || !babelResult.code) {
              throw new Error('Babel compilation returned empty code');
            }

            const coreJsPath = join(process.cwd(), 'node_modules', 'core-js-bundle', 'minified.js');
            const fetchPath = join(process.cwd(), 'node_modules', 'whatwg-fetch', 'dist', 'fetch.umd.js');
            const abortPath = join(process.cwd(), 'node_modules', 'abortcontroller-polyfill', 'dist', 'abortcontroller-polyfill-only.js');

            const coreJsCode = existsSync(coreJsPath) ? readFileSync(coreJsPath, 'utf8') : '';
            const fetchCode = existsSync(fetchPath) ? readFileSync(fetchPath, 'utf8') : '';
            const abortCode = existsSync(abortPath) ? readFileSync(abortPath, 'utf8') : '';

            const polyfillsJs = [
              '/* --- CORE-JS POLYFILLS --- */',
              coreJsCode,
              '/* --- FETCH POLYFILL --- */',
              fetchCode,
              '/* --- ABORT CONTROLLER POLYFILL --- */',
              abortCode
            ].join('\n');
            const polyfillsPath = join(process.cwd(), 'dist', 'vendor', 'polyfills.js');
            writeFileSync(polyfillsPath, polyfillsJs, 'utf8');

            const finalAppJs = [
              '/* --- APP BUNDLE --- */',
              babelResult.code
            ].join('\n');

            writeFileSync(appJsPath, finalAppJs, 'utf8');
            console.log('app.js successfully transpiled and polyfilled for webOS 3.0!');
          } catch (e) {
            console.error('Failed to post-process app.js:', e);
            throw e;
          }
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
