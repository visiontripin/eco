/**
 * Сборка автономной (standalone) версии приложения в один HTML-файл.
 *
 * Результат:
 *   docs/index.html                        — приложение для GitHub Pages (offline-first)
 *   docs/404.html                          — SPA-fallback для Pages
 *   docs/.nojekyll                         — отключает Jekyll на Pages
 *   docs/downloads/*.zip                   — архив для Android (открывается без сервера)
 *   docs/screenshots/*.png                 — картинки для README и og:image
 *
 * В автономной версии нет обращений к серверу: `src/lib/api.ts` переключается
 * на встроенный движок `src/lib/browserDb.ts` (localStorage), поэтому приложение
 * работает даже при открытии файла с диска без интернета.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const TMP_OUT = path.join(ROOT, '.static-build');
const SCREENSHOTS_DIR = path.join(ROOT, 'screenshots');

const APP_NAME = 'Подработка.МСК';
const APP_TITLE = 'Подработка.МСК — смены и подработки в Москве и Московской области';
const APP_DESCRIPTION =
  'Быстрые смены в Москве и Московской области: оплата за смену, прямые выплаты без комиссии с заработка, проверенные работодатели, смены рядом с метро и МЦД.';

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="#D82376"/><text x="96" y="124" font-family="system-ui,sans-serif" font-size="94" font-weight="900" text-anchor="middle" fill="#FFFFFF">П</text></svg>`;

const ANDROID_README = `${APP_NAME} — АВТОНОМНАЯ ВЕРСИЯ ДЛЯ ANDROID (РАБОТАЕТ БЕЗ ИНТЕРНЕТА)
====================================================================

1. Распакуйте архив в любую папку на телефоне (например, «Загрузки»).
2. Откройте файл «index.html» через Chrome, Яндекс Браузер, Samsung Internet
   или встроенный просмотрщик HTML.
3. Всё работает локально: данные хранятся в памяти браузера на вашем устройстве.

Что внутри:
  - поиск смен по Москве и Московской области, станции метро и МЦД;
  - карточки смен, отклики в один клик, избранное;
  - переключение ролей справа сверху: Рабочий / Работодатель / Модератор;
  - публикация вакансий, дублирование смен, чат по отклику, закрытие смены, оценки;
  - модерация отзывов и тарифы в админ-панели.

Демо-данные и изменения сохраняются только в этом браузере.
`;

function buildHtml({ cssCode, jsCode, iconDataUri, manifestDataUri }) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover" />
    <title>${APP_TITLE}</title>
    <meta name="description" content="${APP_DESCRIPTION}" />
    <meta name="theme-color" content="#FFFFFF" />
    <meta name="color-scheme" content="light" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${APP_NAME}" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:title" content="${APP_NAME} — смены на сегодня и завтра" />
    <meta property="og:description" content="${APP_DESCRIPTION}" />
    <meta property="og:image" content="./screenshots/og-cover.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" type="image/svg+xml" href="${iconDataUri}" />
    <link rel="apple-touch-icon" href="${iconDataUri}" />
    <link rel="manifest" href="${manifestDataUri}" />
    <style>${cssCode}</style>
  </head>
  <body class="bg-white text-ink-900 antialiased selection:bg-brand-100 selection:text-brand-800">
    <div id="root"></div>
    <script>${jsCode}</script>
  </body>
</html>
`;
}

async function buildBundle() {
  await build({
    configFile: false,
    plugins: [react()],
    define: {
      // автономная сборка не ходит в /api вообще — данные из localStorage
      __PODRABOTKA_STANDALONE__: JSON.stringify(true),
    },
    build: {
      outDir: TMP_OUT,
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: 100_000_000,
      rollupOptions: {
        output: {
          format: 'iife',
          name: 'PodrabotkaApp',
          inlineDynamicImports: true,
          entryFileNames: 'bundle.js',
          assetFileNames: 'bundle.[ext]',
        },
      },
    },
  });

  const cssPath = path.join(TMP_OUT, 'bundle.css');
  const jsPath = path.join(TMP_OUT, 'bundle.js');
  const cssCode = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const jsCode = fs.readFileSync(jsPath, 'utf8').replace(/<\/script/gi, '<\\/script');
  return { cssCode, jsCode };
}

function writeZip(htmlPath) {
  const downloadsDir = path.join(DOCS_DIR, 'downloads');
  fs.mkdirSync(downloadsDir, { recursive: true });

  const zipName = 'podrabotka-msk-android-preview.zip';
  const zipPath = path.join(downloadsDir, zipName);
  const instructionPath = path.join(TMP_OUT, 'ИНСТРУКЦИЯ_ДЛЯ_ANDROID.txt');
  fs.writeFileSync(instructionPath, ANDROID_README);

  execFileSync('python3', [
    '-c',
    `
import zipfile
with zipfile.ZipFile(${JSON.stringify(zipPath)}, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    zf.write(${JSON.stringify(htmlPath)}, 'index.html')
    zf.write(${JSON.stringify(instructionPath)}, 'ИНСТРУКЦИЯ_ДЛЯ_ANDROID.txt')
`,
  ]);
  return { zipName, zipPath };
}

function copyScreenshots() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) return 0;
  const target = path.join(DOCS_DIR, 'screenshots');
  fs.mkdirSync(target, { recursive: true });
  let copied = 0;
  for (const entry of fs.readdirSync(SCREENSHOTS_DIR)) {
    if (!entry.endsWith('.png')) continue;
    fs.copyFileSync(path.join(SCREENSHOTS_DIR, entry), path.join(target, entry));
    copied += 1;
  }
  return copied;
}

async function main() {
  fs.rmSync(DOCS_DIR, { recursive: true, force: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const { cssCode, jsCode } = await buildBundle();

  const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(ICON_SVG).toString('base64')}`;
  const manifest = {
    name: `${APP_NAME} — Москва и МО`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#D82376',
    icons: [
      { src: iconDataUri, sizes: '192x192 512x512', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  };
  const manifestDataUri = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(manifest)
  )}`;

  const html = buildHtml({ cssCode, jsCode, iconDataUri, manifestDataUri });
  const indexPath = path.join(DOCS_DIR, 'index.html');
  fs.writeFileSync(indexPath, html);
  fs.writeFileSync(path.join(DOCS_DIR, '404.html'), html);
  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '');

  const { zipPath } = writeZip(indexPath);
  const shots = copyScreenshots();

  fs.rmSync(TMP_OUT, { recursive: true, force: true });

  const htmlKb = Math.round(fs.statSync(indexPath).size / 1024);
  const zipKb = Math.round(fs.statSync(zipPath).size / 1024);
  console.log(`docs/          автономное приложение: ${htmlKb} KB (index.html + 404.html)`);
  console.log(`docs/downloads Android-архив: ${zipKb} KB`);
  console.log(`docs/screenshots ${shots} PNG`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
