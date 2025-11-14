import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";

let SecureStore;
try {
  // eslint-disable-next-line global-require
  SecureStore = require("expo-secure-store");
} catch (error) {
  SecureStore = null;
}

const STORAGE_KEY = "resi.selectedVoice";

const VoiceContext = createContext({
  selectedVoice: null,
  setSelectedVoice: async () => {},
  clearVoice: async () => {},
  isLoading: true,
});

export const VoiceProvider = ({ children }) => {
  const [selectedVoice, setSelectedVoiceState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const storage = useMemo(() => {
    if (Platform.OS === "web") {
      return {
        getItem: async (key) => {
          if (typeof window === "undefined" || !window.localStorage) return null;
          return window.localStorage.getItem(key);
        },
        setItem: async (key, value) => {
          if (typeof window === "undefined" || !window.localStorage) return;
          window.localStorage.setItem(key, value);
        },
        deleteItem: async (key) => {
          if (typeof window === "undefined" || !window.localStorage) return;
          window.localStorage.removeItem(key);
        },
      };
    }
    if (SecureStore?.getItemAsync) {
      return {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        deleteItem: SecureStore.deleteItemAsync,
      };
    }
    // Fallback to in-memory storage
    const memoryStore = new Map();
    return {
      getItem: async (key) => memoryStore.get(key) ?? null,
      setItem: async (key, value) => {
        memoryStore.set(key, value);
      },
      deleteItem: async (key) => {
        memoryStore.delete(key);
      },
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadVoice = async () => {
      try {
        const storedValue = await storage.getItem(STORAGE_KEY);
        if (storedValue && isMounted) {
          setSelectedVoiceState(JSON.parse(storedValue));
        }
      } catch (error) {
        console.warn("[Voice] Failed to load stored voice", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadVoice();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistVoice = useCallback(
    async (voice) => {
      try {
        if (!voice) {
          await storage.deleteItem(STORAGE_KEY);
        } else {
          await storage.setItem(STORAGE_KEY, JSON.stringify(voice));
        }
      } catch (error) {
        console.warn("[Voice] Failed to persist voice selection", error);
      }
    },
    [storage]
  );

  const setSelectedVoice = useCallback(
    async (voice) => {
      setSelectedVoiceState(voice);
      await persistVoice(voice);
    },
    [persistVoice]
  );

  const clearVoice = useCallback(async () => {
    await setSelectedVoice(null);
  }, [setSelectedVoice]);

  const value = useMemo(
    () => ({
      selectedVoice,
      setSelectedVoice,
      clearVoice,
      isLoading,
    }),
    [selectedVoice, setSelectedVoice, clearVoice, isLoading]
  );

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);

