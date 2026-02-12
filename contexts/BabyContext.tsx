import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Baby, BabyGender } from '../types';
import { generateId } from '../utils/time';
import { getAllBabies, insertBaby, updateBaby as dbUpdateBaby, deleteBaby as dbDeleteBaby } from '../database';
import { STORAGE_KEYS } from '../constants';

interface BabyContextType {
  babies: Baby[];
  selectedBaby: Baby | null;
  selectBaby: (baby: Baby) => void;
  addBaby: (name: string, birthDate?: string, gender?: BabyGender) => Promise<Baby>;
  editBaby: (id: string, name: string, birthDate?: string, gender?: BabyGender) => Promise<void>;
  removeBaby: (id: string) => Promise<void>;
  loading: boolean;
}

const BabyContext = createContext<BabyContextType>({
  babies: [],
  selectedBaby: null,
  selectBaby: () => {},
  addBaby: async () => ({ id: '', name: '', birthDate: '', gender: undefined, createdAt: '' }),
  editBaby: async () => {},
  removeBaby: async () => {},
  loading: true,
});

export function BabyProvider({ children }: { children: React.ReactNode }) {
  const [babies, setBabies] = useState<Baby[]>([]);
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBabies();
  }, []);

  const loadBabies = async () => {
    try {
      const rows = await getAllBabies();
      const mapped: Baby[] = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        birthDate: r.birth_date || '',
        gender: r.gender || undefined,
        createdAt: r.created_at,
      }));
      setBabies(mapped);

      // Restore selected baby
      const savedId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_BABY_ID);
      if (savedId) {
        const found = mapped.find((b) => b.id === savedId);
        if (found) {
          setSelectedBaby(found);
        } else if (mapped.length > 0) {
          setSelectedBaby(mapped[0]);
        }
      } else if (mapped.length > 0) {
        setSelectedBaby(mapped[0]);
      }
    } catch (err) {
      console.error('Failed to load babies:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectBaby = useCallback(async (baby: Baby) => {
    setSelectedBaby(baby);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_BABY_ID, baby.id);
    } catch {
      // Silently fail
    }
  }, []);

  const addBaby = useCallback(async (name: string, birthDate?: string, gender?: BabyGender): Promise<Baby> => {
    const id = generateId();
    await insertBaby(id, name, birthDate, gender);
    const newBaby: Baby = {
      id,
      name,
      birthDate: birthDate || '',
      gender,
      createdAt: new Date().toISOString(),
    };
    setBabies((prev) => [...prev, newBaby]);
    if (!selectedBaby) {
      setSelectedBaby(newBaby);
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_BABY_ID, id);
    }
    return newBaby;
  }, [selectedBaby]);

  const editBaby = useCallback(async (id: string, name: string, birthDate?: string, gender?: BabyGender) => {
    await dbUpdateBaby(id, name, birthDate, gender);
    setBabies((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name, birthDate: birthDate || '', gender } : b))
    );
    if (selectedBaby?.id === id) {
      setSelectedBaby((prev) => prev ? { ...prev, name, birthDate: birthDate || '', gender } : prev);
    }
  }, [selectedBaby]);

  const removeBaby = useCallback(async (id: string) => {
    await dbDeleteBaby(id);
    setBabies((prev) => {
      const remaining = prev.filter((b) => b.id !== id);
      if (selectedBaby?.id === id) {
        const next = remaining.length > 0 ? remaining[0] : null;
        setSelectedBaby(next);
        if (next) {
          AsyncStorage.setItem(STORAGE_KEYS.SELECTED_BABY_ID, next.id);
        } else {
          AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_BABY_ID);
        }
      }
      return remaining;
    });
  }, [selectedBaby]);

  return (
    <BabyContext.Provider
      value={{ babies, selectedBaby, selectBaby, addBaby, editBaby, removeBaby, loading }}
    >
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby() {
  return useContext(BabyContext);
}
