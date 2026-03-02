import { useState, useEffect, useCallback } from 'react';
import { Meeting, GreenAreaEvent, House, User, Rsvp, RsvpStatus } from '@/types';
import { mockMeetings, mockEvents } from '@/data/mockData';
import { usersApi, housesApi, CreateUserPayload, UpdateUserPayload, CreateHousePayload, UpdateHousePayload } from '@/lib/api';

const MEETINGS_KEY = 'privadas_meetings';
const EVENTS_KEY = 'privadas_events';
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

// Houses Hook (API-based)
export function useHouses() {
  const [houses, setHouses] = useState<House[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await housesApi.getAll();
      setHouses(data);
    } catch (e) {
      console.error('Error loading houses:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addHouse = async (data: CreateHousePayload): Promise<House> => {
    const house = await housesApi.create(data);
    setHouses(prev => [...prev, house]);
    return house;
  };

  const updateHouse = async (id: string, data: UpdateHousePayload): Promise<House> => {
    const house = await housesApi.update(id, data);
    setHouses(prev => prev.map(h => h.id === id ? house : h));
    return house;
  };

  const deleteHouse = async (id: string): Promise<void> => {
    await housesApi.remove(id);
    setHouses(prev => prev.filter(h => h.id !== id));
  };

  return { houses, isLoading, addHouse, updateHouse, deleteHouse };
}

// Users Hook (API-based)
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addUser = async (data: CreateUserPayload): Promise<User> => {
    const user = await usersApi.create(data);
    setUsers(prev => [...prev, user]);
    return user;
  };

  const updateUser = async (id: string, data: UpdateUserPayload): Promise<User> => {
    const user = await usersApi.update(id, data);
    setUsers(prev => prev.map(u => u.id === id ? user : u));
    return user;
  };

  const deleteUser = async (id: string): Promise<void> => {
    await usersApi.remove(id);
    setUsers(prev => prev.filter(u => u.id !== id));
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
