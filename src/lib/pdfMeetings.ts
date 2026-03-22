import jsPDF, { GState } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/types';
import type { RsvpWithUser } from '@/lib/api';
import logoSrc from '@/assets/logo.png';

const MONTHS_UPPER = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function parseDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00');
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function agendaItems(description?: string): string[] {
  if (!description?.trim()) return [];
  return description.split('\n').map((l) => l.trim()).filter(Boolean);
}

async function loadBase64(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Convocatoria ─────────────────────────────────────────────────────────────
export async function downloadConvocatoria(meeting: Meeting) {
  // Letter: 215.9 x 279.4 mm
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 22; // left margin
  const mR = 22; // right margin
  const textW = pageW - mL - mR;

  const date = parseDate(meeting.date);
  const year = date.getFullYear();
  const monthUpper = MONTHS_UPPER[date.getMonth()];
  const dayName = format(date, 'EEEE', { locale: es });
  const dayNum = date.getDate();
  const monthLong = format(date, 'MMMM', { locale: es });
  const time12 = formatTime12h(meeting.startTime);

  const logoData = await loadBase64(logoSrc);

  // ── Top-left logo ────────────────────────────────────────────────────────
  if (logoData) {
    doc.addImage(logoData, 'PNG', mL, 10, 38, 30);
  }

  // ── Header (centered) ────────────────────────────────────────────────────
  let y = 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('ASAMBLEA VECINAL ORDINARIA.', pageW / 2, y, { align: 'center' });

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FRACCIONAMIENTO \u201cPRIVADAS DEL PARQUE\u201d', pageW / 2, y, { align: 'center' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(monthUpper + ' ' + year, pageW / 2, y, { align: 'center' });

  y += 14;

  // ── Body paragraph ───────────────────────────────────────────────────────
  doc.setFontSize(11);
  const body =
    `Por medio del presente, se convoca a los vecinos del Fraccionamiento ` +
    `"Privadas del Parque", para el ${dayName} ${dayNum} de ${monthLong} de ${year}, ` +
    `en ${meeting.location} a las ${time12}. La junta vecinal se desarrollar\u00e1 ` +
    `conforme al siguiente orden del d\u00eda:`;
  const bodyLines = doc.splitTextToSize(body, textW);
  doc.text(bodyLines, mL, y, { align: 'justify' });
  y += bodyLines.length * 5.8 + 6;

  // ── Agenda (bullets) ─────────────────────────────────────────────────────
  const items = agendaItems(meeting.description);
  const allItems = [
    'Lista de asistencia y verificaci\u00f3n de qu\u00f3rum.',
    ...items,
    'Acuerdos y cierre.',
  ];
  for (const item of allItems) {
    const lines = doc.splitTextToSize('\u2022 ' + item, textW - 10);
    doc.text(lines, mL + 10, y);
    y += lines.length * 5.8 + 1;
  }
  y += 7;

  // ── Note ─────────────────────────────────────────────────────────────────
  const note =
    'Nota: Se les reitera que los acuerdos tomados en la junta son de aplicaci\u00f3n general.';
  const noteLines = doc.splitTextToSize(note, textW);
  doc.text(noteLines, mL, y, { align: 'justify' });
  y += noteLines.length * 5.8 + 10;

  // ── Sign-off (centered) ───────────────────────────────────────────────────
  doc.text(
    'Agradecemos su puntual asistencia y quedamos de usted.',
    pageW / 2, y, { align: 'center' },
  );
  y += 6;
  doc.text(
    `\u00abMesa Directiva de Vecinos ${year}\u00bb`,
    pageW / 2, y, { align: 'center' },
  );

  // ── Separator line ───────────────────────────────────────────────────────
  const sepY = pageH - 78;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(mL, sepY, pageW - mR, sepY);

  // ── Bottom watermark logo ─────────────────────────────────────────────────
  if (logoData) {
    const logoW = 155;
    const logoH = 62;
    const logoX = (pageW - logoW) / 2;
    const logoY = sepY + 4;

    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.15 }));
    doc.addImage(logoData, 'PNG', logoX, logoY, logoW, logoH);
    doc.restoreGraphicsState();
  }

  doc.save(`Convocatoria_${monthUpper}_${year}.pdf`);
}

// ─── Minuta ───────────────────────────────────────────────────────────────────
export async function downloadMinuta(meeting: Meeting, attendees: RsvpWithUser[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 22;
  const mR = 22;
  const textW = pageW - mL - mR;

  const date = parseDate(meeting.date);
  const year = date.getFullYear();
  const monthUpper = MONTHS_UPPER[date.getMonth()];
  const dayNum = date.getDate();
  const monthLong = format(date, 'MMMM', { locale: es });
  const time12 = meeting.startTime ? formatTime12h(meeting.startTime) : '';

  const logoData = await loadBase64(logoSrc);

  function checkPage(cy: number, needed = 14): number {
    if (cy + needed > pageH - 20) {
      doc.addPage();
      // Logo top-left on new page
      if (logoData) doc.addImage(logoData, 'PNG', mL, 10, 28, 22);
      return 40;
    }
    return cy;
  }

  function sectionTitle(title: string, cy: number): number {
    cy = checkPage(cy, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, mL, cy);
    doc.setFont('helvetica', 'normal');
    return cy + 6;
  }

  // ── Top-left logo ────────────────────────────────────────────────────────
  if (logoData) {
    doc.addImage(logoData, 'PNG', mL, 10, 38, 30);
  }

  // ── Header ───────────────────────────────────────────────────────────────
  let y = 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('ASAMBLEA VECINAL ORDINARIA.', pageW / 2, y, { align: 'center' });

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FRACCIONAMIENTO \u201cPRIVADAS DEL PARQUE\u201d', pageW / 2, y, { align: 'center' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(monthUpper + ' ' + year, pageW / 2, y, { align: 'center' });
  y += 10;

  // ── Acta title ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ACTA DE ASAMBLEA GENERAL ORDINARIA', pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Fraccionamiento: Privadas del Parque', mL, y);
  y += 6;
  doc.text('Ciudad/Estado: Durango, Durango', mL, y);
  y += 10;

  // ── 1) Encabezado ────────────────────────────────────────────────────────
  y = sectionTitle('1) Encabezado', y);
  const enc =
    `En la ciudad de Durango, Durango, en el \u00e1rea de uso com\u00fan ubicada en ` +
    `${meeting.location}, del fraccionamiento Privadas del Parque, siendo las ${time12} ` +
    `del d\u00eda ${dayNum} de ${monthLong} de ${year}, se reunieron los colonos, convocados ` +
    `por el Comit\u00e9 de Vecinos, con el objeto de celebrar la Asamblea General Ordinaria. ` +
    `Habi\u00e9ndose emitido la convocatoria correspondiente, los acuerdos tomados en la ` +
    `presente asamblea ser\u00e1n obligatorios para todos los colonos.`;
  const encLines = doc.splitTextToSize(enc, textW);
  doc.text(encLines, mL, y, { align: 'justify' });
  y += encLines.length * 5.8 + 8;

  // ── 2) Lista de asistencia ────────────────────────────────────────────────
  y = sectionTitle('2) Lista de asistencia', y);
  doc.text(
    'Se registra la asistencia de los siguientes colonos (nombre y domicilio/casa):',
    mL, y,
  );
  y += 6;
  const attending = attendees.filter((a) => a.status === 'attending' && a.user);
  if (attending.length === 0) {
    doc.text('(Sin asistentes registrados en el sistema)', mL + 8, y);
    y += 6;
  } else {
    for (let i = 0; i < attending.length; i++) {
      y = checkPage(y, 6);
      const u = attending[i].user!;
      const addr = u.house ? ` \u2014 ${u.house.address || u.house.houseNumber}` : '';
      doc.text(`${i + 1}. ${u.name} ${u.lastName}${addr}`, mL + 8, y);
      y += 5.5;
    }
  }
  y += 6;

  // ── 3) Quórum ─────────────────────────────────────────────────────────────
  y = sectionTitle('3) Qu\u00f3rum', y);
  doc.text(
    'Se establece como criterio de qu\u00f3rum con las personas presentes efectuar la junta.',
    mL, y,
  );
  y += 10;

  // ── 4) Orden del día ──────────────────────────────────────────────────────
  y = sectionTitle('4) Orden del d\u00eda', checkPage(y, 14));
  const items = agendaItems(meeting.description);
  const allItems = [
    'Declaraci\u00f3n de instalaci\u00f3n de la asamblea y qu\u00f3rum.',
    ...items,
    'Acuerdos y cierre.',
  ];
  for (let i = 0; i < allItems.length; i++) {
    y = checkPage(y, 6);
    const lines = doc.splitTextToSize(`${i + 1}. ${allItems[i]}`, textW - 8);
    doc.text(lines, mL + 8, y);
    y += lines.length * 5.5 + 1;
  }
  y += 6;

  // ── 5) Desarrollo ─────────────────────────────────────────────────────────
  y = sectionTitle('5) Desarrollo de la asamblea', checkPage(y, 14));
  if (meeting.minutes) {
    const minuteLines = meeting.minutes.split('\n').filter((l) => l.trim());
    for (const line of minuteLines) {
      y = checkPage(y, 7);
      const text = line.trim().startsWith('\u2022') ? line.trim() : `\u2022 ${line.trim()}`;
      const wrapped = doc.splitTextToSize(text, textW - 8);
      doc.text(wrapped, mL + 8, y);
      y += wrapped.length * 5.5 + 2;
    }
  } else {
    doc.text('(Sin contenido de acta)', mL + 8, y);
    y += 6;
  }
  y += 8;

  // ── 6) Clausura ───────────────────────────────────────────────────────────
  y = sectionTitle('6) Clausura', checkPage(y, 20));
  const endTime = meeting.endTime ? formatTime12h(meeting.endTime) : '';
  const clausura = endTime
    ? `No habiendo m\u00e1s asuntos que tratar, se da por concluida la asamblea a la ` +
      `${endTime} del d\u00eda ${dayNum} de ${monthLong} de ${year}, levant\u00e1ndose ` +
      `la presente acta para los efectos conducentes.`
    : `No habiendo m\u00e1s asuntos que tratar, se da por concluida la asamblea del ` +
      `d\u00eda ${dayNum} de ${monthLong} de ${year}, levant\u00e1ndose la presente ` +
      `acta para los efectos conducentes.`;
  const clausuraLines = doc.splitTextToSize(clausura, textW);
  doc.text(clausuraLines, mL, y, { align: 'justify' });
  y += clausuraLines.length * 5.8 + 16;

  // ── Bottom watermark on last page ─────────────────────────────────────────
  if (logoData) {
    const lastPageH = pageH;
    const sepY = lastPageH - 78;
    if (y < sepY) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(mL, sepY, pageW - mR, sepY);

      doc.saveGraphicsState();
      doc.setGState(new GState({ opacity: 0.15 }));
      doc.addImage(logoData, 'PNG', (pageW - 155) / 2, sepY + 4, 155, 62);
      doc.restoreGraphicsState();
    }
  }

  doc.save(`Minuta_${monthUpper}_${year}.pdf`);
}
