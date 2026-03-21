export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'VECINO' | 'PRESIDENTE' | 'SECRETARIO' | 'TESORERO';

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  role: UserRole;
  houseId?: string;
  house?: House;
  isActive?: boolean;
  createdAt?: string;
}

export interface House {
  id: string;
  houseNumber: string;
  address?: string;
  status: 'active' | 'inactive';
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

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
