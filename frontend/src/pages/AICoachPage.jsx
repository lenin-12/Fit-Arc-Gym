import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Send, Sparkles, User, Clock, Trash2 } from 'lucide-react';
import LockBanner from '../components/common/LockBanner';
import "../components/dashboard/Dashboard.css";

const AICoachPage = () => {
  const { user, authFetch, token, API_BASE_URL } = useAuth();
  const location = useLocation();
  const [upgradeLocked, setUpgradeLocked] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef(null);

  // Initialize with welcome message if history is empty
  const getWelcomeMessage = () => ({
    role: 'assistant',
    content: `Hello ${user?.name || 'Athlete'}! I am your OpenAI-powered AI Fitness & Nutrition Coach. I have loaded your profile (${user?.weight || 70}kg, Goal: ${user?.fitnessGoal || 'Gain Muscle'}). How can I tune your training or macros today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const fetchHistory = async () => {
    try {
      const data = await authFetch('/ai/history', { method: 'GET' });
      if (data.success && data.data?.chatHistory && data.data.chatHistory.length > 0) {
        setMessages(
          data.data.chatHistory.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }))
        );
      } else {
        setMessages([getWelcomeMessage()]);
      }
    } catch (e) {
      console.error('Error fetching chat history:', e);
      setMessages([getWelcomeMessage()]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (location.state?.initialPrompt) {
      handleSend(location.state.initialPrompt);
    }
  }, [location.state]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, isStreaming]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading || isStreaming) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user', content: query, timestamp: timeStr };

    // Update messages with user query
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    setLoading(true);
    setIsStreaming(true);

    // Create a placeholder message ID for the incoming stream response
    const assistantMsgId = 'assistant_stream_' + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/coach-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: query })
      });

      if (response.status === 403) {
        const errorData = await response.json();
        setUpgradeLocked(true);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: errorData.message || 'Daily limit reached for Basic plan (3/3 queries). Upgrade to Premium for Unlimited AI Coach access!'
                }
              : msg
          )
        );
        setIsStreaming(false);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Streaming API failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedText = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          
          // Parse Server-Sent Events (SSE) data chunks
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataValue = line.slice(6).trim();
              if (dataValue === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataValue);
                if (parsed.text) {
                  streamedText += parsed.text;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId ? { ...msg, content: streamedText } : msg
                    )
                  );
                }
              } catch (e) {
                // Ignore partial JSON parsing errors
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error in AI Coach stream:', e);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: 'Error: Connection lost or daily limit reached. Please check your connection and premium plan!'
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear your entire chat history? This cannot be undone.')) {
      setLoading(true);
      try {
        const res = await authFetch('/ai/history/clear', { method: 'POST' });
        if (res && res.success) {
          setMessages([getWelcomeMessage()]);
          setUpgradeLocked(false);
        }
      } catch (err) {
        console.error('Error clearing chat history:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const suggestedQuestions = [
    'Can I eat biryani today?',
    'How much protein should I eat?',
    'Suggest shoulder workout routine.',
    'How to improve stamina and endurance?'
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <Sparkles color="#FFD60A" />
            <span>AI Fitness Coach</span>
          </h1>
        </div>
        <button
          onClick={handleClearHistory}
          disabled={loading || isStreaming}
          style={{
            background: 'transparent',
            border: '1px solid #2A2A2A',
            color: '#B3B3B3',
            borderRadius: '10px',
            padding: '0.6rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: (loading || isStreaming) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 200ms ease'
          }}
          onMouseEnter={(e) => {
            if (!loading && !isStreaming) {
              e.currentTarget.style.borderColor = '#FF5252';
              e.currentTarget.style.color = '#FF5252';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2A2A2A';
            e.currentTarget.style.color = '#B3B3B3';
          }}
        >
          <Trash2 size={15} />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Chatbot Interface */}
      <div className="chat-container" style={{ height: '700px' }}>
        <div className="chat-header" style={{ borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#2A2A2A', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
            <Bot color="#FFD60A" size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#FFFFFF' }}>FIT-ARC AI Coach</h3>
          </div>
        </div>

        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-msg ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.78rem', opacity: 0.85 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  <strong style={{ textTransform: 'capitalize' }}>{msg.role === 'user' ? 'You' : 'AI Coach'}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', color: '#888888' }}>
                  <Clock size={12} />
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{msg.content}</div>
            </div>
          ))}

          {/* Typing / Streaming Indicator */}
          {loading && !messages[messages.length - 1]?.content && (
            <div className="chat-msg chat-msg-ai" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', maxWidth: '300px' }}>
              <Bot size={14} />
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', background: '#FFFFFF', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }} />
                <div style={{ width: '6px', height: '6px', background: '#FFFFFF', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
                <div style={{ width: '6px', height: '6px', background: '#FFFFFF', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {upgradeLocked && (
          <div style={{ padding: '0 1rem' }}>
            <LockBanner
              featureName="Unlimited AI Coach Queries"
              requiredTier="Premium"
              description="You have reached the free 3 daily queries limit on the Basic plan. Upgrade to Premium to unlock unlimited AI coaching!"
            />
          </div>
        )}

        <div className="chat-input-area" style={{ borderTop: '1px solid #2A2A2A', padding: '1.2rem' }}>
          <div style={{ width: '100%' }}>
            <div className="quick-prompts" style={{ marginBottom: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  className="prompt-chip"
                  onClick={() => handleSend(q)}
                  disabled={loading || isStreaming}
                  style={{
                    background: '#090909',
                    border: '1px solid #2A2A2A',
                    color: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: (loading || isStreaming) ? 'not-allowed' : 'pointer',
                    transition: 'all 200ms ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !isStreaming) {
                      e.currentTarget.style.borderColor = '#FFD60A';
                      e.currentTarget.style.color = '#FFD60A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2A2A2A';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                >
                  💡 {q}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ask anything (e.g. 'Can I eat biryani today?' or 'Suggest shoulder workout')..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={loading || isStreaming}
                style={{
                  flex: 1,
                  background: '#090909',
                  border: '1px solid #2A2A2A',
                  borderRadius: '10px',
                  padding: '0.8rem 1rem',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button
                className="auth-btn-primary"
                style={{
                  width: 'auto',
                  padding: '0 1.6rem',
                  margin: 0,
                  background: '#FFD60A',
                  color: '#090909',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: (loading || isStreaming || !input.trim()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (loading || isStreaming || !input.trim()) ? 0.6 : 1
                }}
                onClick={() => handleSend()}
                disabled={loading || isStreaming || !input.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICoachPage;
