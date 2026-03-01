import { useState, useEffect, useCallback } from 'react';
import { Meeting, GreenAreaEvent, House, User, Rsvp, RsvpStatus } from '@/types';
import { mockMeetings, mockEvents, mockHouses, mockUsers } from '@/data/mockData';

const MEETINGS_KEY = 'privadas_meetings';
const EVENTS_KEY = 'privadas_events';
const HOUSES_KEY = 'privadas_houses';
const USERS_KEY = 'privadas_users';
const RSVPS_KEY = 'privadas_rsvps';

function getStoredData<T>(key: string, defaultData: T[]): T[] {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultData;
    }
  }
  localStorage.setItem(key, JSON.stringify(defaultData));
  return defaultData;
}

function setStoredData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Meetings Hook
export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMeetings(getStoredData(MEETINGS_KEY, mockMeetings));
    setIsLoading(false);
  }, []);

  const addMeeting = (meeting: Omit<Meeting, 'id' | 'createdAt'>) => {
    const newMeeting: Meeting = {
      ...meeting,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...meetings, newMeeting];
    setMeetings(updated);
    setStoredData(MEETINGS_KEY, updated);
    return newMeeting;
  };

  const updateMeeting = (id: string, data: Partial<Meeting>) => {
    const updated = meetings.map(m => m.id === id ? { ...m, ...data } : m);
    setMeetings(updated);
    setStoredData(MEETINGS_KEY, updated);
  };

  const deleteMeeting = (id: string) => {
    const updated = meetings.filter(m => m.id !== id);
    setMeetings(updated);
    setStoredData(MEETINGS_KEY, updated);
  };

  return { meetings, isLoading, addMeeting, updateMeeting, deleteMeeting };
}

// Events Hook
export function useEvents() {
  const [events, setEvents] = useState<GreenAreaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setEvents(getStoredData(EVENTS_KEY, mockEvents));
    setIsLoading(false);
  }, []);

  const addEvent = (event: Omit<GreenAreaEvent, 'id' | 'createdAt'>) => {
    const newEvent: GreenAreaEvent = {
      ...event,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    setStoredData(EVENTS_KEY, updated);
    return newEvent;
  };

  const updateEvent = (id: string, data: Partial<GreenAreaEvent>) => {
    const updated = events.map(e => e.id === id ? { ...e, ...data } : e);
    setEvents(updated);
    setStoredData(EVENTS_KEY, updated);
  };

  const deleteEvent = (id: string) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    setStoredData(EVENTS_KEY, updated);
  };

  return { events, isLoading, addEvent, updateEvent, deleteEvent };
}

// Houses Hook
export function useHouses() {
  const [houses, setHouses] = useState<House[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHouses(getStoredData(HOUSES_KEY, mockHouses));
    setIsLoading(false);
  }, []);

  const addHouse = (house: Omit<House, 'id' | 'createdAt'>) => {
    const newHouse: House = {
      ...house,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...houses, newHouse];
    setHouses(updated);
    setStoredData(HOUSES_KEY, updated);
    return newHouse;
  };

  const updateHouse = (id: string, data: Partial<House>) => {
    const updated = houses.map(h => h.id === id ? { ...h, ...data } : h);
    setHouses(updated);
    setStoredData(HOUSES_KEY, updated);
  };

  const deleteHouse = (id: string) => {
    const updated = houses.filter(h => h.id !== id);
    setHouses(updated);
    setStoredData(HOUSES_KEY, updated);
  };

  return { houses, isLoading, addHouse, updateHouse, deleteHouse };
}

// Users Hook
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUsers(getStoredData(USERS_KEY, mockUsers));
    setIsLoading(false);
  }, []);

  const addUser = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
    };
    const updated = [...users, newUser];
    setUsers(updated);
    setStoredData(USERS_KEY, updated);
    return newUser;
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const updated = users.map(u => u.id === id ? { ...u, ...data } : u);
    setUsers(updated);
    setStoredData(USERS_KEY, updated);
  };

  const deleteUser = (id: string) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    setStoredData(USERS_KEY, updated);
  };

  return { users, isLoading, addUser, updateUser, deleteUser };
}

// RSVP Hook
export function useRsvps() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRsvps(getStoredData<Rsvp>(RSVPS_KEY, []));
    setIsLoading(false);
  }, []);

  const setRsvp = useCallback((userId: string, userName: string, targetType: 'meeting' | 'event', targetId: string, status: RsvpStatus) => {
    setRsvps(prev => {
      const existing = prev.findIndex(r => r.userId === userId && r.targetType === targetType && r.targetId === targetId);
      let updated: Rsvp[];
      if (existing >= 0) {
        updated = prev.map((r, i) => i === existing ? { ...r, status } : r);
      } else {
        const newRsvp: Rsvp = {
          id: Date.now().toString(),
          userId,
          userName,
          targetType,
          targetId,
          status,
          createdAt: new Date().toISOString(),
        };
        updated = [...prev, newRsvp];
      }
      setStoredData(RSVPS_KEY, updated);
      return updated;
    });
  }, []);

  const removeRsvp = useCallback((userId: string, targetType: 'meeting' | 'event', targetId: string) => {
    setRsvps(prev => {
      const updated = prev.filter(r => !(r.userId === userId && r.targetType === targetType && r.targetId === targetId));
      setStoredData(RSVPS_KEY, updated);
      return updated;
    });
  }, []);

  const getUserRsvp = useCallback((userId: string, targetType: 'meeting' | 'event', targetId: string): Rsvp | undefined => {
    return rsvps.find(r => r.userId === userId && r.targetType === targetType && r.targetId === targetId);
  }, [rsvps]);

  const getRsvpsForTarget = useCallback((targetType: 'meeting' | 'event', targetId: string): Rsvp[] => {
    return rsvps.filter(r => r.targetType === targetType && r.targetId === targetId);
  }, [rsvps]);

  const getAttendingCount = useCallback((targetType: 'meeting' | 'event', targetId: string): number => {
    return rsvps.filter(r => r.targetType === targetType && r.targetId === targetId && r.status === 'attending').length;
  }, [rsvps]);

  return { rsvps, isLoading, setRsvp, removeRsvp, getUserRsvp, getRsvpsForTarget, getAttendingCount };
}
