export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'VECINO';

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
  time: string;
  location: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface GreenAreaEvent {
  id: string;
  title: string;
  greenArea: string;
  date: string;
  time: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

export type RsvpStatus = 'attending' | 'not_attending' | 'maybe';

export interface Rsvp {
  id: string;
  userId: string;
  userName: string;
  targetType: 'meeting' | 'event';
  targetId: string;
  status: RsvpStatus;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
