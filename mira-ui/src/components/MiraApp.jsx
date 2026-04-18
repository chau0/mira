import React, { useEffect, useRef, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Edit2,
  Info,
  Menu,
  MessageSquare,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';

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
  const [currentView, setCurrentView] = useState('chat');
  const [sessionId] = useState(generateSessionId());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      role: 'assistant',
      text: 'Hi. I am Mira, your thinking partner. I keep track of your goals and context over time. What are we working on today?',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [memories, setMemories] = useState(initialMemories);
  const [editingMemoryId, setEditingMemoryId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (event) => {
    event?.preventDefault();
    if (!input.trim()) {
      return;
    }

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    window.setTimeout(() => {
      let aiResponse = "That makes sense. Let's explore that further. How does that align with your current goals?";
      let extractedMemory = null;
      let memoryType = 'Context';

      const lowerInput = userMsg.text.toLowerCase();

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
          updatedAt: Date.now(),
        };
        setMemories((prev) => [newMemory, ...prev]);
      }

      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: aiResponse,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const startEditing = (memory) => {
    setEditingMemoryId(memory.id);
    setEditContent(memory.content);
  };

  const saveEdit = (id) => {
    setMemories((prev) =>
      prev.map((memory) =>
        memory.id === id ? { ...memory, content: editContent, updatedAt: Date.now() } : memory,
      ),
    );
    setEditingMemoryId(null);
  };

  const deleteMemory = (id) => {
    if (window.confirm('Are you sure you want to forget this?')) {
      setMemories((prev) => prev.filter((memory) => memory.id !== id));
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 font-sans text-slate-900 lg:px-6 lg:py-6">
      <div className="flex h-[100dvh] flex-col bg-slate-50 lg:mx-auto lg:h-[calc(100dvh-3rem)] lg:max-w-6xl lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-slate-200 lg:bg-white lg:shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-600 p-1.5">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Mira</h1>
            <span className="ml-2 hidden rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500 sm:inline-block">
              Session: {sessionId}
            </span>
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="ml-2 hidden cursor-pointer rounded-md border-transparent bg-slate-100 py-1 pl-2 pr-8 text-xs text-slate-600 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-indigo-200 sm:block"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <nav className="hidden rounded-lg bg-slate-100 p-1 md:flex">
            <button
              onClick={() => setCurrentView('chat')}
              className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${currentView === 'chat' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <MessageSquare className="h-4 w-4" /> Chat
            </button>
            <button
              onClick={() => setCurrentView('memory')}
              className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${currentView === 'memory' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Brain className="h-4 w-4" /> Vault
            </button>
          </nav>

          <button
            className="p-2 text-slate-600 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="absolute left-0 top-[60px] z-10 flex w-full flex-col gap-2 border-b border-slate-200 bg-white p-4 shadow-lg md:hidden">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="font-mono text-xs text-slate-500">Session: {sessionId}</div>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="cursor-pointer rounded-md border-transparent bg-slate-100 py-1.5 pl-2 pr-8 text-xs text-slate-600 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-indigo-200"
              >
                {MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setCurrentView('chat');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 rounded-lg p-3 text-left ${currentView === 'chat' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
            >
              <MessageSquare className="h-5 w-5" /> Active Session
            </button>
            <button
              onClick={() => {
                setCurrentView('memory');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 rounded-lg p-3 text-left ${currentView === 'memory' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
            >
              <Brain className="h-5 w-5" /> Memory Vault
            </button>
          </div>
        )}

        <main className="relative flex flex-1 flex-col overflow-hidden">
          {currentView === 'chat' && (
            <div className="flex h-full flex-1 flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[75%] ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-indigo-600 text-white'
                        : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.text}</p>
                    <div
                      className={`mt-1 text-right text-[10px] ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              )}

                <div ref={messagesEndRef} />
              </div>

              <div className="pb-safe border-t border-slate-200 bg-white p-3 sm:p-4">
                <form onSubmit={handleSendMessage} className="relative mx-auto flex max-w-4xl items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Tell Mira your thoughts..."
                    className="w-full resize-none rounded-xl border-transparent bg-slate-100 px-4 py-3 text-base outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 sm:py-4"
                    rows={1}
                    style={{ minHeight: '52px', maxHeight: '120px' }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="mb-1 flex-shrink-0 rounded-xl bg-indigo-600 p-3 text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-300 disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
                <div className="mt-2 text-center text-[11px] text-slate-400">
                  Mira remembers context. Try saying &quot;My goal is to...&quot; or &quot;I
                  prefer...&quot;
                </div>
              </div>
            </div>
          )}

          {currentView === 'memory' && (
            <div className="flex-1 overflow-y-auto bg-slate-50">
              <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:py-8">
                <div className="mb-8">
                  <h2 className="mb-2 text-2xl font-bold text-slate-900">Memory Vault</h2>
                  <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-800">
                    <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div>
                      <p>
                        <strong>Total Transparency.</strong> This is everything Mira knows about
                        you across sessions. You are in full control. Edit any assumption, or
                        delete facts you no longer want Mira to consider.
                      </p>
                    </div>
                  </div>
                </div>

                {memories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
                    <Brain className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                    <h3 className="text-lg font-medium text-slate-700">No memories yet</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                      Mira learns organically as you chat. Share a goal, a decision, or a
                      preference to see it appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {memories.map((memory) => (
                      <div
                        key={memory.id}
                        className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {memory.type}
                          </span>

                          <div className="flex gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                            {editingMemoryId !== memory.id && (
                              <button
                                onClick={() => startEditing(memory)}
                                className="rounded bg-slate-50 p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteMemory(memory.id)}
                              className="rounded bg-slate-50 p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {editingMemoryId === memory.id ? (
                          <div className="flex flex-1 flex-col space-y-3">
                            <textarea
                              value={editContent}
                              onChange={(event) => setEditContent(event.target.value)}
                              className="min-h-[100px] w-full flex-1 resize-none rounded-lg border border-indigo-300 bg-white p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingMemoryId(null)}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEdit(memory.id)}
                                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                              >
                                <Save className="h-3 w-3" /> Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-1 flex-col">
                            <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-800">
                              {memory.content}
                            </p>
                            <div className="mt-auto flex items-center gap-1 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                              <CheckCircle2 className="h-3 w-3" /> Captured{' '}
                              {new Date(memory.updatedAt).toLocaleDateString()}
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
    </div>
  );
}
