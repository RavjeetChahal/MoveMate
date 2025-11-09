import React, { createContext, useContext, useState, useCallback } from "react";

const ConversationContext = createContext({
  conversationState: {},
  updateConversationState: () => {},
  clearConversationState: () => {},
  isSchemaComplete: false,
});

const requiredFields = [
  "category",
  "issue_type",
  "location",
  "urgency",
  "summary",
];

export const ConversationProvider = ({ children }) => {
  const [conversationState, setConversationState] = useState({
    messages: [], // Store chat messages here
  });

  const updateConversationState = useCallback((newData) => {
    try {
      // Safe, shallow log to avoid noisy output
      console.log("[Conversation] updateConversationState", {
        incomingKeys: Object.keys(newData || {}),
      });
    } catch {}
    setConversationState((prevState) => ({
      ...prevState,
      ...newData,
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const clearConversationState = useCallback(() => {
    console.log("[Conversation] clearConversationState");
    setConversationState({ messages: [] });
  }, []);

  const isSchemaComplete = requiredFields.every(
    (field) => conversationState[field]
  );

  const value = {
    conversationState,
    updateConversationState,
    clearConversationState,
    isSchemaComplete,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = () => useContext(ConversationContext);
