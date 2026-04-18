import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Send, 
  Menu, 
  X, 
  Save,
  CheckCircle2,
  Info
} from 'lucide-react';

// --- MOCK DATA & HELPERS ---
const generateSessionId = () => Math.random().toString(36).substring(2, 9).toUpperCase();

const MODELS = [
  { id: 'mira-local', label: 'Mira Local (Default)' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'claude-3-5', label: 'Claude 3.5 Sonnet' },
];

const initialMemories = [
  { id: '1', type: 'Goal', content: 'Build a memory-aware AI thinking partner.', updatedAt: Date.now() - 86400000 },
  { id: '2', type: 'Preference', content: 'Prefers local-first architecture and minimal dependencies.', updatedAt: Date.now() - 43200000 },
];

export default function MiraApp() {
  // App State
  const [currentView, setCurrentView] = useState('chat'); // 'chat' or 'memory'
  const [sessionId] = useState(generateSessionId());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);

  // Chat State
  const [messages, setMessages] = useState([
    { id: 'msg-1', role: 'assistant', text: 'Hi. I am Mira, your thinking partner. I keep track of your goals and context over time. What are we working on today?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Memory State
  const [memories, setMemories] = useState(initialMemories);
  const [editingMemoryId, setEditingMemoryId] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // Handle message sending & Mock AI Response
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: `msg-${Date.now()}`, role: 'user', text: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Mock AI Logic to extract memory
    setTimeout(() => {
      let aiResponse = "That makes sense. Let's explore that further. How does that align with your current goals?";
      let extractedMemory = null;
      let memoryType = 'Context';

      const lowerInput = userMsg.text.toLowerCase();
      
      // Keyword triggers for testing the memory extraction
      if (lowerInput.includes('my goal is')) {
        extractedMemory = userMsg.text.substring(lowerInput.indexOf('my goal is') + 10).trim();
        memoryType = 'Goal';
        aiResponse = "I've noted that new goal. How are you planning to approach it?";
      } else if (lowerInput.includes('i prefer')) {
        extractedMemory = userMsg.text.substring(lowerInput.indexOf('i prefer') + 8).trim();
        memoryType = 'Preference';
        aiResponse = "Got it, I'll remember that preference for the future.";
      } else if (lowerInput.includes('we decided') || lowerInput.includes('i decided')) {
        extractedMemory = userMsg.text.trim();
        memoryType = 'Decision';
        aiResponse = "Decision recorded. I'll hold you to that.";
      }

      if (extractedMemory) {
        const newMemory = {
          id: `mem-${Date.now()}`,
          type: memoryType,
          content: extractedMemory.charAt(0).toUpperCase() + extractedMemory.slice(1),
          updatedAt: Date.now()
        };
        setMemories(prev => [newMemory, ...prev]);
      }

      const aiMsg = { id: `msg-${Date.now() + 1}`, role: 'assistant', text: aiResponse, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  // Memory Management Functions
  const startEditing = (memory) => {
    setEditingMemoryId(memory.id);
    setEditContent(memory.content);
  };

  const saveEdit = (id) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, content: editContent, updatedAt: Date.now() } : m));
    setEditingMemoryId(null);
  };

  const deleteMemory = (id) => {
    if (window.confirm("Are you sure you want to forget this?")) {
      setMemories(prev => prev.filter(m => m.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 text-slate-900 font-sans">
      
      {/* Header / Nav */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Brain className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Mira</h1>
          <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-2 hidden sm:inline-block">
            Session: {sessionId}
          </span>
          
          {/* Desktop Model Selector */}
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="hidden sm:block ml-2 text-xs bg-slate-100 border-transparent text-slate-600 rounded-md py-1 pl-2 pr-8 focus:ring-2 focus:ring-indigo-200 focus:bg-white cursor-pointer transition-colors outline-none"
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setCurrentView('chat')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${currentView === 'chat' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
          <button 
            onClick={() => setCurrentView('memory')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${currentView === 'memory' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Brain className="w-4 h-4" /> Vault
          </button>
        </nav>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-slate-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Nav Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[60px] left-0 w-full bg-white border-b border-slate-200 z-10 shadow-lg p-4 flex flex-col gap-2">
           <div className="flex justify-between items-center mb-2 px-1">
             <div className="text-xs text-slate-500 font-mono">Session: {sessionId}</div>
             <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-xs bg-slate-100 border-transparent text-slate-600 rounded-md py-1.5 pl-2 pr-8 focus:ring-2 focus:ring-indigo-200 focus:bg-white cursor-pointer transition-colors outline-none"
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
           </div>
           <button 
            onClick={() => { setCurrentView('chat'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 p-3 rounded-lg text-left ${currentView === 'chat' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
          >
            <MessageSquare className="w-5 h-5" /> Active Session
          </button>
          <button 
            onClick={() => { setCurrentView('memory'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 p-3 rounded-lg text-left ${currentView === 'memory' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
          >
            <Brain className="w-5 h-5" /> Memory Vault
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        
        {/* === CHAT VIEW === */}
        {currentView === 'chat' && (
          <div className="flex-1 flex flex-col h-full">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                  }`}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200 p-3 sm:p-4 pb-safe">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Tell Mira your thoughts..."
                  className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl px-4 py-3 sm:py-4 text-base resize-none transition-all outline-none"
                  rows={1}
                  style={{ minHeight: '52px', maxHeight: '120px' }}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="mb-1 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              <div className="text-center mt-2 text-[11px] text-slate-400">
                Mira remembers context. Try saying "My goal is to..." or "I prefer..."
              </div>
            </div>
          </div>
        )}

        {/* === MEMORY VIEW (TRUST ARCHITECTURE) === */}
        {currentView === 'memory' && (
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:py-8">
              
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Memory Vault</h2>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-sm leading-relaxed">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <p><strong>Total Transparency.</strong> This is everything Mira knows about you across sessions. You are in full control—edit any assumption, or delete facts you no longer want Mira to consider.</p>
                  </div>
                </div>
              </div>

              {memories.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 border-dashed rounded-2xl shadow-sm">
                  <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-700">No memories yet</h3>
                  <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
                    Mira learns organically as you chat. Share a goal, a decision, or a preference to see it appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {memories.map((memory) => (
                    <div key={memory.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600`}>
                          {memory.type}
                        </span>
                        
                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {editingMemoryId !== memory.id && (
                            <button onClick={() => startEditing(memory)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded bg-slate-50 hover:bg-indigo-50 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => deleteMemory(memory.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-slate-50 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {editingMemoryId === memory.id ? (
                        <div className="space-y-3 flex-1 flex flex-col">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full flex-1 text-sm text-slate-700 bg-white border border-indigo-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none min-h-[100px]"
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingMemoryId(null)}
                              className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => saveEdit(memory.id)}
                              className="text-xs px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center gap-1 font-medium transition-colors"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col">
                          <p className="text-slate-800 text-sm leading-relaxed mb-4 flex-1">
                            {memory.content}
                          </p>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-auto pt-3 border-t border-slate-100">
                            <CheckCircle2 className="w-3 h-3" /> Captured {new Date(memory.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}