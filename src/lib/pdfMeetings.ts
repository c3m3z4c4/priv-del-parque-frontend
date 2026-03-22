import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/types';
import type { RsvpWithUser } from '@/lib/api';

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

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/logo-small.png');
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

function addHeader(
  doc: jsPDF,
  logo: string | null,
  monthUpper: string,
  year: number,
  startY = 18,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  let y = startY;

  if (logo) {
    doc.addImage(logo, 'PNG', 20, y, 28, 20);
    y += 26;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('ASAMBLEA VECINAL ORDINARIA.', pageW / 2, y, { align: 'center' });
  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FRACCIONAMIENTO "PRIVADAS DEL PARQUE"', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${monthUpper} ${year}`, pageW / 2, y, { align: 'center' });
  y += 10;

  return y;
}

// ─── Convocatoria ─────────────────────────────────────────────────────────────
export async function downloadConvocatoria(meeting: Meeting) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const date = parseDate(meeting.date);
  const year = date.getFullYear();
  const monthUpper = MONTHS_UPPER[date.getMonth()];
  const dayName = format(date, 'EEEE', { locale: es });
  const dayNum = date.getDate();
  const monthLong = format(date, 'MMMM', { locale: es });
  const time12 = formatTime12h(meeting.startTime);

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 25;
  const marginR = 25;
  const textW = pageW - marginL - marginR;

  const logo = await loadLogoBase64();
  let y = addHeader(doc, logo, monthUpper, year);

  // Body paragraph
  doc.setFontSize(11);
  const body =
    `Por medio del presente, se convoca a los vecinos del Fraccionamiento ` +
    `"Privadas del Parque", para el ${dayName} ${dayNum} de ${monthLong} de ${year}, ` +
    `en ${meeting.location} a las ${time12}. La junta vecinal se desarrollar\u00e1 ` +
    `conforme al siguiente orden del d\u00eda:`;
  const bodyLines = doc.splitTextToSize(body, textW);
  doc.text(bodyLines, marginL, y, { align: 'justify' });
  y += bodyLines.length * 5.5 + 5;

  // Agenda
  const items = agendaItems(meeting.description);
  const allItems = [
    'Lista de asistencia y verificaci\u00f3n de qu\u00f3rum.',
    ...items,
    'Acuerdos y cierre.',
  ];
  for (const item of allItems) {
    const lines = doc.splitTextToSize(`\u2022 ${item}`, textW - 8);
    doc.text(lines, marginL + 8, y);
    y += lines.length * 5.5 + 1;
  }
  y += 6;

  // Note
  const note =
    'Nota: Se les reitera que los acuerdos tomados en la junta son de aplicaci\u00f3n general.';
  const noteLines = doc.splitTextToSize(note, textW);
  doc.text(noteLines, marginL, y, { align: 'justify' });
  y += noteLines.length * 5.5 + 10;

  // Sign-off
  doc.text('Agradecemos su puntual asistencia y quedamos de usted.', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.text(`\u00abMesa Directiva de Vecinos ${year}\u00bb`, pageW / 2, y, { align: 'center' });

  doc.save(`Convocatoria_Reunion_${monthUpper}_${year}.pdf`);
}

// ─── Minuta ───────────────────────────────────────────────────────────────────
export async function downloadMinuta(meeting: Meeting, attendees: RsvpWithUser[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const date = parseDate(meeting.date);
  const year = date.getFullYear();
  const monthUpper = MONTHS_UPPER[date.getMonth()];
  const dayNum = date.getDate();
  const monthLong = format(date, 'MMMM', { locale: es });
  const time12 = meeting.startTime ? formatTime12h(meeting.startTime) : '';

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 25;
  const marginR = 25;
  const textW = pageW - marginL - marginR;

  function checkPage(currentY: number, needed = 14): number {
    if (currentY + needed > 265) {
      doc.addPage();
      return 20;
    }
    return currentY;
  }

  function sectionTitle(title: string, currentY: number): number {
    currentY = checkPage(currentY, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, marginL, currentY);
    doc.setFont('helvetica', 'normal');
    return currentY + 6;
  }

  const logo = await loadLogoBase64();
  let y = addHeader(doc, logo, monthUpper, year);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ACTA DE ASAMBLEA GENERAL ORDINARIA', pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Fraccionamiento: Privadas del Parque', marginL, y);
  y += 6;
  doc.text('Ciudad/Estado: Durango, Durango', marginL, y);
  y += 10;

  // 1) Encabezado
  y = sectionTitle('1) Encabezado', y);
  const enc =
    `En la ciudad de Durango, Durango, en el \u00e1rea de uso com\u00fan ubicada en ${meeting.location}, ` +
    `del fraccionamiento Privadas del Parque, siendo las ${time12} del d\u00eda ${dayNum} de ${monthLong} ` +
    `de ${year}, se reunieron los colonos, convocados por el Comit\u00e9 de Vecinos, con el objeto de ` +
    `celebrar la Asamblea General Ordinaria. Habi\u00e9ndose emitido la convocatoria correspondiente, ` +
    `los acuerdos tomados en la presente asamblea ser\u00e1n obligatorios para todos los colonos.`;
  const encLines = doc.splitTextToSize(enc, textW);
  doc.text(encLines, marginL, y, { align: 'justify' });
  y += encLines.length * 5.5 + 8;

  // 2) Lista de asistencia
  y = sectionTitle('2) Lista de asistencia', y);
  const attending = attendees.filter((a) => a.status === 'attending' && a.user);
  doc.setFontSize(11);
  doc.text(
    'Se registra la asistencia de los siguientes colonos (nombre y domicilio/casa):',
    marginL, y,
  );
  y += 6;

  if (attending.length === 0) {
    doc.text('(Sin asistentes registrados en el sistema)', marginL + 8, y);
    y += 6;
  } else {
    for (let i = 0; i < attending.length; i++) {
      y = checkPage(y, 6);
      const u = attending[i].user!;
      const houseAddr = u.house
        ? ` \u2014 ${u.house.address || u.house.houseNumber}`
        : '';
      doc.text(`${i + 1}. ${u.name} ${u.lastName}${houseAddr}`, marginL + 8, y);
      y += 5.5;
    }
  }
  y += 6;

  // 3) Quórum
  y = sectionTitle('3) Qu\u00f3rum', y);
  doc.text(
    'Se establece como criterio de qu\u00f3rum con las personas presentes efectuar la junta.',
    marginL, y,
  );
  y += 10;

  // 4) Orden del día
  y = sectionTitle('4) Orden del d\u00eda', y);
  const items = agendaItems(meeting.description);
  const allItems = [
    'Declaraci\u00f3n de instalaci\u00f3n de la asamblea y qu\u00f3rum.',
    ...items,
    'Acuerdos y cierre.',
  ];
  for (let i = 0; i < allItems.length; i++) {
    y = checkPage(y, 6);
    const lines = doc.splitTextToSize(`${i + 1}. ${allItems[i]}`, textW - 8);
    doc.text(lines, marginL + 8, y);
    y += lines.length * 5.5 + 1;
  }
  y += 6;

  // 5) Desarrollo de la asamblea
  y = sectionTitle('5) Desarrollo de la asamblea', y);
  if (meeting.minutes) {
    const minuteLines = meeting.minutes.split('\n').filter((l) => l.trim());
    for (const line of minuteLines) {
      y = checkPage(y, 7);
      const text = line.trim().startsWith('\u2022') ? line.trim() : `\u2022 ${line.trim()}`;
      const wrapped = doc.splitTextToSize(text, textW - 8);
      doc.text(wrapped, marginL + 8, y);
      y += wrapped.length * 5.5 + 2;
    }
  } else {
    doc.text('(Sin contenido de acta)', marginL + 8, y);
    y += 6;
  }
  y += 8;

  // 6) Clausura
  y = sectionTitle('6) Clausura', checkPage(y, 20));
  const endTime = meeting.endTime ? formatTime12h(meeting.endTime) : '';
  const clausura = endTime
    ? `No habiendo m\u00e1s asuntos que tratar, se da por concluida la asamblea a la ${endTime} ` +
      `del d\u00eda ${dayNum} de ${monthLong} de ${year}, levant\u00e1ndose la presente acta para los efectos conducentes.`
    : `No habiendo m\u00e1s asuntos que tratar, se da por concluida la asamblea del d\u00eda ` +
      `${dayNum} de ${monthLong} de ${year}, levant\u00e1ndose la presente acta para los efectos conducentes.`;
  const clausuraLines = doc.splitTextToSize(clausura, textW);
  doc.text(clausuraLines, marginL, y, { align: 'justify' });

  doc.save(`Minuta_Reunion_${monthUpper}_${year}.pdf`);
}
