import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import axios from 'axios';
import './AIChatSection.css';

interface Message {
  role: 'user' | 'character';
  content: string;
  timestamp: string;
}

interface AIChatSectionProps {
  characterId: string;
  characterName: string;
  id?: string;
}

export const AIChatSection: React.FC<AIChatSectionProps> = ({ 
  characterId, 
  characterName 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/characters/chat', {
        character_id: characterId,
        user_input: input
      });

      const charMessage: Message = {
        role: 'character',
        content: response.data.response,
        timestamp: response.data.timestamp
      };

      setMessages(prev => [...prev, charMessage]);
    } catch (error) {
      console.error('Failed to chat with character', error);
      setMessages(prev => [...prev, {
        role: 'character',
        content: "Désolé, j'ai eu un petit problème de mémoire... Peux-tu répéter ?",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-chat-section">
      <div className="ai-chat-header">
        <MessageSquare className="w-4 h-4 text-violet-400" />
        <h3>Chat de Personnalité</h3>
        <span className="ai-chat-hint">Testez la voix et le caractère de {characterName}</span>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 ? (
          <div className="ai-chat-empty">
            <Sparkles className="w-8 h-8 text-slate-700 mb-2" />
            <p>Commencez une conversation pour découvrir comment {characterName} s'exprime.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`ai-chat-message ${msg.role}`}>
              <div className="ai-chat-message-avatar">
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>
              <div className="ai-chat-message-content">
                <div className="ai-chat-message-text">{msg.content}</div>
                <div className="ai-chat-message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="ai-chat-message character loading">
            <div className="ai-chat-message-avatar">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="ai-chat-message-content">
              <div className="ai-chat-message-text">En train de réfléchir...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Parler à ${characterName}...`}
          className="ai-chat-input"
          disabled={isLoading}
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="ai-chat-send-btn"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
