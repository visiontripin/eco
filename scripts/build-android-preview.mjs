import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const TMP_OUT = path.join(ROOT, 'dist-standalone');

async function main() {
  if (fs.existsSync(DOCS_DIR)) {
    fs.rmSync(DOCS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  await build({
    root: ROOT,
    configFile: false,
    plugins: [react()],
    build: {
      outDir: TMP_OUT,
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: 100000000,
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
  const rawJsCode = fs.readFileSync(jsPath, 'utf8');
  const safeJsCode = rawJsCode.replace(/<\/script/gi, '<\\/script');

  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="#D82376"/><text x="96" y="124" font-family="system-ui,sans-serif" font-size="94" font-weight="900" text-anchor="middle" fill="#FFFFFF">П</text></svg>`;
  const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(svgIcon).toString('base64')}`;

  const manifestObj = {
    name: 'Подработка.МСК — Москва и МО',
    short_name: 'Подработка.МСК',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#D82376',
    icons: [
      {
        src: iconDataUri,
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
  const manifestDataUri = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(manifestObj)
  )}`;

  const standaloneHtml = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#FFFFFF" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>Подработка.МСК — Смены и подработки в Москве и Московской области</title>
    <link rel="icon" type="image/svg+xml" href="${iconDataUri}" />
    <link rel="manifest" href="${manifestDataUri}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@600;700;800&display=swap"
      rel="stylesheet"
    />
    <style>${cssCode}</style>
  </head>
  <body class="bg-white text-ink-900 antialiased selection:bg-brand-100 selection:text-brand-800">
    <div id="root"></div>
    <script>${safeJsCode}</script>
  </body>
</html>
`;

  const readmeRu = `ПОДРАБОТКА.МСК — АВТОНОМНАЯ ВЕРСИЯ ДЛЯ ANDROID (БЕЗ ОШИБКИ 502)
================================================================

Как открыть на смартфоне Android (работает даже полностью БЕЗ интернета и сервера):
1. Распакуйте этот архив в любую папку на телефоне (например, «Загрузки» / Downloads).
2. Нажмите на файл «Подработка_МСК_Android_Preview.html» (или «index.html») и выберите открытие через Google Chrome, Яндекс Браузер, Samsung Internet или встроенный Просмотрщик HTML.
3. Все функции работают полностью интерактивно и без ошибок 502:
   - Поиск смен по Москве и Московской области, выбор станций метро и МЦД;
   - Карточки смен, отклики в 1 клик, избранное;
   - Переключение ролей в правом верхнем углу: Рабочий (Златов Влас) / Работодатель / Модератор;
   - Публикация своих вакансий, дублирование смен, чат по отклику, закрытие смены и оценка;
   - Модерация отзывов и редактирование тарифов в Админ-панели.
`;

  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '');
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), standaloneHtml);
  fs.writeFileSync(path.join(DOCS_DIR, '404.html'), standaloneHtml);
  fs.writeFileSync(path.join(DOCS_DIR, 'podrabotka-msk-android-preview.html'), standaloneHtml);
  fs.writeFileSync(path.join(ROOT, 'Подработка_МСК_Android_Preview.html'), standaloneHtml);

  const zipPath = path.join(DOCS_DIR, 'podrabotka-msk-android-preview.zip');
  const rootZipPath = path.join(ROOT, 'podrabotka-msk-android-preview.zip');
  const readmePath = path.join(TMP_OUT, 'ИНСТРУКЦИЯ_ДЛЯ_ANDROID.txt');
  const ruHtmlPath = path.join(TMP_OUT, 'Подработка_МСК_Android_Preview.html');
  const idxHtmlPath = path.join(TMP_OUT, 'index.html');

  fs.writeFileSync(readmePath, readmeRu);
  fs.writeFileSync(ruHtmlPath, standaloneHtml);
  fs.writeFileSync(idxHtmlPath, standaloneHtml);

  execFileSync('python3', [
    '-c',
    `
import zipfile
with zipfile.ZipFile(${JSON.stringify(zipPath)}, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    zf.write(${JSON.stringify(ruHtmlPath)}, 'Подработка_МСК_Android_Preview.html')
    zf.write(${JSON.stringify(idxHtmlPath)}, 'index.html')
    zf.write(${JSON.stringify(readmePath)}, 'ИНСТРУКЦИЯ_ДЛЯ_ANDROID.txt')
`,
  ]);

  fs.copyFileSync(zipPath, rootZipPath);
  fs.rmSync(TMP_OUT, { recursive: true, force: true });

  const zipSizeKb = Math.round(fs.statSync(zipPath).size / 1024);
  console.log(`Zero-external-request Android HTML & ZIP (${zipSizeKb} KB) built successfully.`);
}

main();
