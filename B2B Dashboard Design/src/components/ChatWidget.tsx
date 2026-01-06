
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Route } from '../App';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

interface ChatWidgetProps {
    route: Route;
    onClose: () => void;
    isOpen: boolean;
    isDarkMode?: boolean;
}

export function ChatWidget({ route, onClose, isOpen, isDarkMode = false }: ChatWidgetProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Hello! I'm your AI assistant for ${route.courier.name}. Ask me anything about this route's resilience, weather risks, or carbon footprint.`,
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare context from route data
            const context = {
                route_name: route.courier.name,
                origin: route.origin,
                destination: route.destination,
                metrics: {
                    time: route.time,
                    distance: route.distance,
                    cost: route.cost,
                    carbon: route.carbonEmission,
                },
                scores: {
                    resilience: route.resilienceScore,
                    status: route.status,
                    disruption_risk: route.disruptionRisk
                },
                analysis: route.analysisData || route.geminiOutput,
                intermediate_cities: route.intermediate_cities
            };

            const response = await fetch('http://localhost:5000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.text,
                    routeId: route.id,
                    context: context,
                    session_id: `session_${route.id}`
                }),
            });

            const data = await response.json();

            if (data.response) {
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: data.response,
                    sender: 'ai',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                throw new Error(data.error || 'Failed to get response');
            }

        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm having trouble connecting to the AI service. Please try again later.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4`}>
            <div
                className={`w-full max-w-md h-[600px] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}
            >
                {/* Header */}
                <div className={`p-4 flex items-center justify-between border-b ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                            }`}>
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Resilience Assistant
                            </h3>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Discussing {route.courier.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender === 'user'
                                        ? isDarkMode
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-indigo-600 text-white rounded-br-none'
                                        : isDarkMode
                                            ? 'bg-gray-700 text-gray-100 rounded-bl-none'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                    }`}
                            >
                                <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                                <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'
                                    }`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className={`rounded-2xl px-4 py-3 rounded-bl-none ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                                }`}>
                                <Loader2 className={`w-5 h-5 animate-spin ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className={`p-4 border-t ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Ask about this route..."
                            className={`flex-1 px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode
                                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                }`}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={`p-2 rounded-xl bg-indigo-600 text-white transition-colors flex items-center justify-center ${!input.trim() || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
                                }`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
