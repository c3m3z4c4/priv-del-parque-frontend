// Branded PDF export utility
// Colors from logo: dark green #2d5a1b, amber #c9922a, light green #f0f7ed, border #c5dbb8

export interface PDFStat {
  label: string;
  value: string;
  color?: string;
}

export interface PDFOptions {
  title: string;
  subtitle?: string;
  logoUrl: string;
  columns: string[];
  rows: string[][];
  stats?: PDFStat[];
  filename?: string;
}

async function toBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export async function exportBrandedPDF(options: PDFOptions): Promise<void> {
  const { title, subtitle, logoUrl, columns, rows, stats } = options;
  const logoBase64 = await toBase64(logoUrl);
  const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  const statsHtml = stats && stats.length > 0
    ? `<div class="stats">${stats.map(s => `
        <div class="stat">
          <div class="stat-label">${s.label}</div>
          <div class="stat-value" style="${s.color ? `color:${s.color}` : ''}">${s.value}</div>
        </div>`).join('')}
      </div>`
    : '';

  const theadCells = columns.map(c => `<th>${c}</th>`).join('');
  const tbodyRows = rows.map((row, i) =>
    `<tr class="${i % 2 === 1 ? 'alt' : ''}">${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; }

    /* Header */
    .header {
      background: #2d5a1b;
      color: #fff;
      padding: 18px 28px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .header img { height: 64px; width: 64px; object-fit: contain; border-radius: 50%; background: #fff; padding: 4px; }
    .header-text { flex: 1; }
    .header-title { font-size: 22px; font-weight: 700; letter-spacing: 0.3px; }
    .header-community { font-size: 12px; opacity: 0.85; margin-top: 2px; }

    /* Accent bar */
    .accent-bar {
      background: #c9922a;
      color: #fff;
      padding: 7px 28px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Body */
    .body { padding: 24px 28px; }

    /* Stats */
    .stats {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .stat {
      border: 1.5px solid #c5dbb8;
      border-radius: 8px;
      padding: 10px 18px;
      min-width: 110px;
      background: #f0f7ed;
    }
    .stat-label { font-size: 10px; color: #4a7a30; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .stat-value { font-size: 20px; font-weight: 700; color: #2d5a1b; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
    thead tr { background: #2d5a1b; }
    th {
      color: #fff;
      text-align: left;
      padding: 9px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-weight: 600;
      border-right: 1px solid #4a7a30;
    }
    th:last-child { border-right: none; }
    td { padding: 8px 12px; border-bottom: 1px solid #c5dbb8; vertical-align: top; }
    tr.alt td { background: #f0f7ed; }
    tr:last-child td { border-bottom: none; }

    /* Footer */
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 2px solid #c5dbb8;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #6b7280;
    }
    .footer strong { color: #2d5a1b; }

    @media print {
      body { margin: 0; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .accent-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr.alt td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .stat { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
    <div class="header-text">
      <div class="header-title">${title}</div>
      <div class="header-community">Privadas del Parque &mdash; Comunidad Vecinal</div>
    </div>
  </div>
  <div class="accent-bar">
    <span>${subtitle ?? title}</span>
    <span>Generado el ${dateStr}</span>
  </div>
  <div class="body">
    ${statsHtml}
    <table>
      <thead><tr>${theadCells}</tr></thead>
      <tbody>${tbodyRows}</tbody>
    </table>
    <div class="footer">
      <span><strong>Privadas del Parque</strong> &mdash; Documento generado automáticamente</span>
      <span>Total de registros: ${rows.length}</span>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}
