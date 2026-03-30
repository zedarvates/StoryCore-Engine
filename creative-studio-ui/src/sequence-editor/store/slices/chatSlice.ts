import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatState {
  messages: Message[];
  isOpen: boolean;
  isMinimized: boolean;
  isThinking: boolean;
}

const initialState: ChatState = {
  messages: [
    { role: 'assistant', content: "Hello! I'm your cinematic assistant. How can I help you refine your sequence today?" }
  ],
  isOpen: true,
  isMinimized: false,
  isThinking: false
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setIsOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
    setIsMinimized: (state, action: PayloadAction<boolean>) => {
      state.isMinimized = action.payload;
    },
    setIsThinking: (state, action: PayloadAction<boolean>) => {
      state.isThinking = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [initialState.messages[0]];
    }
  }
});

export const { addMessage, setIsOpen, setIsMinimized, setIsThinking, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;
