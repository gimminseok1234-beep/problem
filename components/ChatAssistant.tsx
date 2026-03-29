import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot } from 'lucide-react';
import { askAiTutor } from '../services/geminiService';
import { Question } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatAssistantProps {
  contextQuestion?: Question;
  userApiKey?: string;
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ contextQuestion, userApiKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: contextQuestion ? `안녕하세요! ${contextQuestion.id}번 문제에 대해 도와드릴까요?` : "안녕하세요! AI 튜터입니다. 시험에 대해 무엇이든 물어보세요!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Reset chat when question changes
  useEffect(() => {
    if (contextQuestion && isOpen) {
        setMessages([{ role: 'model', text: `${contextQuestion.id}번 문제: "${contextQuestion.questionText}"에 대해 이야기해봅시다. 어떤 부분이 이해가 안 되시나요?` }]);
    }
  }, [contextQuestion, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
        const response = await askAiTutor(messages, userMsg, contextQuestion, userApiKey);
        setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
        setMessages(prev => [...prev, { role: 'model', text: "죄송합니다. 연결에 문제가 생겼습니다. 다시 시도해주세요." }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-xl transition-all hover:scale-105 flex items-center gap-2"
        >
          <Bot className="w-6 h-6" />
          <span className="font-medium pr-1">AI 질문</span>
        </button>
      )}

      {isOpen && (
        <div className="bg-white dark:bg-gray-800 w-[90vw] md:w-[600px] h-[70vh] md:h-[650px] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">
          <div className="bg-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-1 bg-white/20 rounded-lg">
                    <Bot className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">AI 튜터</h3>
                    <p className="text-xs text-indigo-100 opacity-80">학습 도우미</p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-500 rounded p-1 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-base leading-relaxed shadow-sm ${
                    m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 text-gray-800 rounded-bl-none'
                }`}>
                  {m.role === 'user' ? (
                      m.text
                  ) : (
                      <div className="markdown-body text-sm md:text-base bg-transparent dark:text-gray-100">
                          <ReactMarkdown components={{
                              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                              li: ({node, ...props}) => <li className="mb-1" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-indigo-700 dark:text-indigo-300" {...props} />
                          }}>
                              {m.text}
                          </ReactMarkdown>
                      </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2 shrink-0">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="질문을 입력하세요..."
              className="flex-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-full px-5 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={loading}
              className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;