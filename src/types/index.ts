export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'VECINO' | 'PRESIDENTE' | 'SECRETARIO' | 'TESORERO';

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  role: UserRole;
  houseId?: string;
  house?: House;
  isActive?: boolean;
  createdAt?: string;
}

export type HouseType = 'terreno' | 'en_construccion' | 'casa';

export interface House {
  id: string;
  houseNumber: string;
  address?: string;
  status: 'active' | 'inactive';
  type: HouseType;
  residents?: User[];
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  description: string;
  minutes?: string;
  minutesAgreements?: string;
  minutesResponsibles?: string;
  minutesClosingTime?: string;
  status: 'active' | 'cancelled' | 'postponed';
  cancelReason?: string;
  originalDate?: string;
  originalStartTime?: string;
  createdAt: string;
  createdById?: string;
}

export interface GreenAreaEvent {
  id: string;
  title: string;
  greenArea: string;
  date: string;
  startTime: string;
  endTime?: string;
  description: string;
  status: 'active' | 'cancelled' | 'postponed';
  cancelReason?: string;
  originalDate?: string;
  originalStartTime?: string;
  createdAt: string;
  createdById?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_event' | 'new_meeting';
  title: string;
  message: string;
  targetId: string;
  targetType: 'event' | 'meeting';
  read: boolean;
  createdAt: string;
}

export type RsvpStatus = 'attending' | 'not_attending' | 'maybe';

export interface Rsvp {
  id: string;
  userId: string;
  targetType: 'meeting' | 'event';
  targetId: string;
  status: RsvpStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DuesConfig {
  id: string;
  amount: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface DuesPayment {
  id: string;
  userId: string;
  houseId?: string;
  month: number;
  year: number;
  amount: number;
  status: 'paid' | 'pending' | 'exempt';
  paidAt?: string;
  notes?: string;
  createdAt: string;
  user?: User;
  house?: House;
}

export interface DuesSummary {
  total: number;
  paid: number;
  pending: number;
  exempt: number;
  totalAmount: number;
  collectedAmount: number;
}

export type ProjectStatus = 'planned' | 'started' | 'in_review' | 'completed' | 'paused';

export interface Project {
  id: string;
  name: string;
  description: string;
  completionPercentage: number;
  status: ProjectStatus;
  visibleToVecinos: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DuesPromotion {
  id: string;
  name: string;
  description?: string;
  monthCount: number;
  discountPercentage: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdAt: string;
}

export interface DuesPolicy {
  id: string;
  dueDay: number;
  mobileLockMonths: number;
  cardLockMonths: number;
  createdAt: string;
}

export type ExtraordinaryCategory = 'multa' | 'evento' | 'obra' | 'cuota_especial' | 'otro';

export interface ExtraordinaryIncome {
  id: string;
  concept: string;
  description?: string;
  amount: number;
  date: string;
  category: ExtraordinaryCategory;
  houseId?: string;
  notes?: string;
  createdById?: string;
  house?: House;
  createdAt: string;
}

export type DebtorAccessStatus = 'active' | 'mobile_suspended' | 'card_suspended';

export interface Debtor {
  userId: string;
  userName: string;
  userEmail: string;
  houseNumber: string;
  houseAddress: string;
  pendingMonths: number;
  accessStatus: DebtorAccessStatus;
  pendingPayments: { month: number; year: number; amount: number }[];
}

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'closed';

export interface GreenAreaReservation {
  id: string;
  userId: string;
  user?: User;
  greenArea: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: ReservationStatus;
  adminNotes?: string;
  reviewedById?: string;
  reviewedBy?: User;
  // Closure
  closedById?: string;
  closedBy?: User;
  closedAt?: string;
  checklistBanos?: boolean;
  checklistInstalaciones?: boolean;
  closureNotes?: string;
  chargeAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  sender?: { id: string; name: string; lastName: string; email: string };
  recipientId: string;
  recipient?: { id: string; name: string; lastName: string; email: string };
  subject: string;
  body: string;
  read: boolean;
  isBroadcast: boolean;
  broadcastId?: string | null;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
