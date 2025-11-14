import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
const VoiceContext = createContext({
  selectedVoice: null,
  setSelectedVoice: async () => {},
  clearVoice: async () => {},
  isLoading: true,
});

export const VoiceProvider = ({ children }) => {
  const [selectedVoice, setSelectedVoiceState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const setSelectedVoice = useCallback(async (voice) => {
    setSelectedVoiceState(voice);
  }, []);

  const clearVoice = useCallback(async () => {
    setSelectedVoiceState(null);
  }, []);

  const value = {
    selectedVoice,
    setSelectedVoice,
    clearVoice,
    isLoading,
  };

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);

