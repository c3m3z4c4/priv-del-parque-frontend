import { User, House, Meeting, GreenAreaEvent } from '@/types';

// Mock Users (kept for reference only; app now uses real API)
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Administrador',
    lastName: 'General',
    email: 'admin@privadasdelparque.com',
    role: 'ADMIN',
  },
  {
    id: '2',
    name: 'Juan',
    lastName: 'Pérez García',
    email: 'juan.perez@email.com',
    role: 'VECINO',
    houseId: '1',
  },
  {
    id: '3',
    name: 'María',
    lastName: 'López Hernández',
    email: 'maria.lopez@email.com',
    role: 'VECINO',
    houseId: '2',
  },
];

// Mock Houses (kept for reference only; app now uses real API)
export const mockHouses: House[] = [
  { id: '1', houseNumber: 'A-101', status: 'active', createdAt: '2024-01-15' },
  { id: '2', houseNumber: 'A-102', status: 'active', createdAt: '2024-01-15' },
  { id: '3', houseNumber: 'B-201', status: 'inactive', createdAt: '2024-01-20' },
];

// Mock Meetings
// Helper to get dates relative to today
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

export const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Asamblea General Ordinaria',
    date: futureDate(1),
    time: '18:00',
    location: 'Salón de usos múltiples',
    description: 'Revisión del presupuesto anual y elección de nueva mesa directiva. Se tratarán temas de mantenimiento y mejoras del fraccionamiento.',
    createdAt: '2024-01-10',
    createdBy: '1',
  },
  {
    id: '2',
    title: 'Reunión de Seguridad',
    date: futureDate(3),
    time: '19:00',
    location: 'Área común principal',
    description: 'Discusión sobre mejoras en el sistema de vigilancia y nuevos protocolos de acceso.',
    createdAt: '2024-01-15',
    createdBy: '1',
  },
  {
    id: '3',
    title: 'Comité de Áreas Verdes',
    date: futureDate(7),
    time: '17:30',
    location: 'Jardín central',
    description: 'Planificación de actividades de jardinería comunitaria y mantenimiento de áreas verdes.',
    createdAt: '2024-01-18',
    createdBy: '1',
  },
];

// Mock Events
export const mockEvents: GreenAreaEvent[] = [
  {
    id: '1',
    title: 'Yoga en el Parque',
    greenArea: 'Jardín Central',
    date: futureDate(0),
    time: '07:00',
    description: 'Sesión de yoga matutina para todos los vecinos. Traer tapete propio.',
    createdAt: '2024-01-12',
    createdBy: '1',
  },
  {
    id: '2',
    title: 'Picnic Familiar',
    greenArea: 'Área de Convivencia Norte',
    date: futureDate(2),
    time: '12:00',
    description: 'Evento familiar de convivencia. Cada familia trae su canasta de comida para compartir.',
    createdAt: '2024-01-14',
    createdBy: '1',
  },
  {
    id: '3',
    title: 'Cine al Aire Libre',
    greenArea: 'Explanada Principal',
    date: futureDate(5),
    time: '20:00',
    description: 'Proyección de película familiar. Se proporcionarán palomitas y bebidas.',
    createdAt: '2024-01-20',
    createdBy: '1',
  },
];

// Green areas list
export const greenAreas = [
  'Jardín Central',
  'Área de Convivencia Norte',
  'Área de Convivencia Sur',
  'Explanada Principal',
  'Parque Infantil',
  'Zona de Asadores',
];
