import { useState, useEffect, useCallback } from 'react';
import { Meeting, GreenAreaEvent, House, User, Rsvp, RsvpStatus } from '@/types';
import {
  usersApi, housesApi, meetingsApi, eventsApi, rsvpsApi,
  CreateUserPayload, UpdateUserPayload, CreateHousePayload, UpdateHousePayload,
  CreateMeetingPayload, CreateEventPayload,
} from '@/lib/api';

// Meetings Hook (API-based)
export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await meetingsApi.getAll();
      setMeetings(data);
    } catch (e) {
      console.error('Error loading meetings:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addMeeting = async (data: CreateMeetingPayload): Promise<Meeting> => {
    const meeting = await meetingsApi.create(data);
    setMeetings(prev => [...prev, meeting]);
    return meeting;
  };

  const updateMeeting = async (id: string, data: Partial<CreateMeetingPayload>): Promise<Meeting> => {
    const meeting = await meetingsApi.update(id, data);
    setMeetings(prev => prev.map(m => m.id === id ? meeting : m));
    return meeting;
  };

  const deleteMeeting = async (id: string): Promise<void> => {
    await meetingsApi.remove(id);
    setMeetings(prev => prev.filter(m => m.id !== id));
  };

  return { meetings, isLoading, addMeeting, updateMeeting, deleteMeeting };
}

// Events Hook (API-based)
export function useEvents() {
  const [events, setEvents] = useState<GreenAreaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await eventsApi.getAll();
      setEvents(data);
    } catch (e) {
      console.error('Error loading events:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEvent = async (data: CreateEventPayload): Promise<GreenAreaEvent> => {
    const event = await eventsApi.create(data);
    setEvents(prev => [...prev, event]);
    return event;
  };

  const updateEvent = async (id: string, data: Partial<CreateEventPayload>): Promise<GreenAreaEvent> => {
    const event = await eventsApi.update(id, data);
    setEvents(prev => prev.map(e => e.id === id ? event : e));
    return event;
  };

  const deleteEvent = async (id: string): Promise<void> => {
    await eventsApi.remove(id);
    setEvents(prev => prev.filter(e => e.id !== id));
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

  return { houses, isLoading, addHouse, updateHouse, deleteHouse, refetch: load };
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

// RSVP Hook (API-based)
export function useRsvps() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await rsvpsApi.getAll();
      setRsvps(data);
    } catch (e) {
      console.error('Error loading rsvps:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setRsvp = useCallback(async (_userId: string, _userName: string, targetType: 'meeting' | 'event', targetId: string, status: RsvpStatus) => {
    const rsvp = await rsvpsApi.upsert(targetType, targetId, status);
    setRsvps(prev => {
      const idx = prev.findIndex(r => r.targetType === targetType && r.targetId === targetId);
      return idx >= 0 ? prev.map((r, i) => i === idx ? rsvp : r) : [...prev, rsvp];
    });
  }, []);

  const removeRsvp = useCallback(async (_userId: string, targetType: 'meeting' | 'event', targetId: string) => {
    await rsvpsApi.remove(targetType, targetId);
    setRsvps(prev => prev.filter(r => !(r.targetType === targetType && r.targetId === targetId)));
  }, []);

  const getUserRsvp = useCallback((_userId: string, targetType: 'meeting' | 'event', targetId: string): Rsvp | undefined => {
    return rsvps.find(r => r.targetType === targetType && r.targetId === targetId);
  }, [rsvps]);

  const getRsvpsForTarget = useCallback((targetType: 'meeting' | 'event', targetId: string): Rsvp[] => {
    return rsvps.filter(r => r.targetType === targetType && r.targetId === targetId);
  }, [rsvps]);

  const getAttendingCount = useCallback((targetType: 'meeting' | 'event', targetId: string): number => {
    return rsvps.filter(r => r.targetType === targetType && r.targetId === targetId && r.status === 'attending').length;
  }, [rsvps]);

  return { rsvps, isLoading, setRsvp, removeRsvp, getUserRsvp, getRsvpsForTarget, getAttendingCount };
}
