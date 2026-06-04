import type { Sermon } from '@/types';

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;700&family=Spectral:wght@400;500;600;700&family=DM+Serif+Display&display=swap';

export function printSermon(sermon: Sermon): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('No se pudo abrir la vista de impresión. Revisa si el navegador bloqueó la ventana.');
    return;
  }

  const title = sermon.titulo.trim() || 'Sermon';
  const safeTitle = buildDocumentTitle(title);
  const printableContent = buildPrintableContent(sermon.contenidoHTML);
  const passage = sermon.pasaje?.trim();

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(safeTitle)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${FONT_LINK}" rel="stylesheet" />
    <style>
      :root {
        color-scheme: light;
        --ink: #221c18;
        --muted: #74685f;
        --border: #e5d8ca;
        --paper: #fffdf9;
        --paper-edge: #f4ede3;
        --accent: #2d2926;
      }
      @page {
        size: portrait;
        margin: 11mm 10mm 12mm;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--paper-edge);
        color: var(--ink);
      }
      body {
        font-family: 'Spectral', serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-shell {
        max-width: 860px;
        margin: 0 auto;
        background: var(--paper);
        min-height: 100vh;
        padding: 54px 54px 70px;
        box-sizing: border-box;
      }
      .print-header {
        margin-bottom: 28px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--border);
      }
      .print-kicker {
        font-family: 'Inter', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 11px;
        font-weight: 700;
        color: var(--muted);
        margin-bottom: 14px;
      }
      .print-title {
        margin: 0;
        font-family: 'Playfair Display', serif;
        font-size: 40px;
        line-height: 1.08;
        color: var(--ink);
      }
      .print-passage {
        margin-top: 12px;
        font-size: 20px;
        line-height: 1.4;
        color: var(--muted);
        font-style: italic;
      }
      .print-body {
        font-size: 21px;
        line-height: 1;
      }
      .print-body p,
      .print-body ul,
      .print-body ol,
      .print-body blockquote,
      .print-body table {
        margin: 0 0 0.95em;
      }
      .print-body h1,
      .print-body h2,
      .print-body h3 {
        font-family: 'Playfair Display', serif;
        line-height: 1.18;
        color: var(--ink);
        margin: 1.25em 0 0.45em;
        page-break-after: avoid;
      }
      .print-body h1 { font-size: 1.6em; }
      .print-body h2 { font-size: 1.34em; }
      .print-body h3 { font-size: 1.16em; }
      .print-body a {
        color: inherit;
        text-decoration: none;
      }
      .print-body img {
        max-width: 100%;
        border-radius: 10px;
        page-break-inside: avoid;
      }
      .print-body table {
        width: 100%;
        border-collapse: collapse;
      }
      .print-body th,
      .print-body td {
        border: 1px solid var(--border);
        padding: 8px 10px;
      }
      .print-body .smart-block {
        margin: 1.05em 0;
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        page-break-inside: avoid;
      }
      .print-body .smart-block-header {
        margin: 0 0 0.28em;
        font-family: 'Inter', sans-serif;
        font-size: 0.92em;
        line-height: 1.2;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--ink);
      }
      .print-body .smart-block[data-label="cita"],
      .print-body .smart-block[data-label="cita biblica"],
      .print-body .smart-block[data-label="cita bíblica"] {
        font-style: normal;
      }
      .print-body .bible-verse-num,
      .print-body sup {
        font-family: 'Inter', sans-serif;
        font-size: 0.72em;
        font-style: normal;
        font-weight: 800;
        color: var(--ink);
        vertical-align: baseline;
        position: relative;
        top: -0.45em;
        margin-right: 0.18em;
      }
      .print-body .margin-note-anchor {
        background: transparent;
        border-bottom: none;
        cursor: text;
      }
      .print-body .margin-note-anchor.flash {
        background: transparent;
      }
      @media print {
        html, body { background: #fff; }
        .print-shell {
          max-width: none;
          padding: 0;
          min-height: auto;
          background: transparent;
        }
        .print-header {
          margin-bottom: 16px;
          padding-bottom: 14px;
        }
        .print-kicker {
          font-size: 9px;
          margin-bottom: 10px;
        }
        .print-title {
          font-size: 31px;
          line-height: 1.04;
        }
        .print-passage {
          margin-top: 8px;
          font-size: 16px;
          line-height: 1.3;
        }
        .print-body {
          font-size: 18px;
          line-height: 1;
        }
        .print-body p,
        .print-body ul,
        .print-body ol,
        .print-body blockquote,
        .print-body table {
          margin: 0 0 0.72em;
        }
        .print-body h1,
        .print-body h2,
        .print-body h3 {
          margin: 1em 0 0.36em;
        }
        .print-body .smart-block {
          margin: 0.8em 0;
          padding: 0;
        }
        .print-body .smart-block-header {
          margin-bottom: 0.22em;
          letter-spacing: 0.05em;
        }
        .print-body .bible-verse-num,
        .print-body sup {
          font-size: 0.66em;
          top: -0.38em;
        }
      }
    </style>
  </head>
  <body>
    <main class="print-shell">
      <header class="print-header">
        <div class="print-kicker">Sermon Maker Pro</div>
        <h1 class="print-title">${escapeHtml(title)}</h1>
        ${passage ? `<div class="print-passage">${escapeHtml(passage)}</div>` : ''}
      </header>
      <article class="print-body">${printableContent}</article>
    </main>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 180);
      });
    </script>
  </body>
</html>`);
  printWindow.document.title = safeTitle;
  printWindow.document.close();
}

function buildPrintableContent(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html || '<p></p>';

  container.querySelectorAll<HTMLElement>('[contenteditable]').forEach(element => {
    element.removeAttribute('contenteditable');
  });

  container.querySelectorAll<HTMLElement>('.margin-note-anchor').forEach(element => {
    const wrapper = document.createElement('span');
    wrapper.textContent = element.textContent ?? '';
    element.replaceWith(wrapper);
  });

  container.querySelectorAll<HTMLElement>('img').forEach(image => {
    image.removeAttribute('width');
    image.removeAttribute('height');
  });

  return container.innerHTML.trim() || '<p>(Sermón vacío)</p>';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDocumentTitle(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Sermon';
}