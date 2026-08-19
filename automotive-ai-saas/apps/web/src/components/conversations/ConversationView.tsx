'use client';

import { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '@automotive-ai-saas/types';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface ConversationViewProps {
  conversation: Conversation;
  onSendMessage: (content: string, channel: string) => void;
  onStatusChange: (status: Conversation['status']) => void;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  ESCALATED: 'bg-red-100 text-red-800',
  BOT: 'bg-blue-100 text-blue-800',
  HUMAN: 'bg-purple-100 text-purple-800',
};

const statusLabels: Record<string, string> = {
  OPEN: 'Abierta',
  PENDING: 'Pendiente',
  CLOSED: 'Cerrada',
  ESCALATED: 'Escalada',
  BOT: 'Bot',
  HUMAN: 'Humano',
};

const channelIcons: Record<string, React.ReactNode> = {
  WHATSAPP: (
    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.472.099-.174.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378 9.86 9.86 0 01-1.378-5.031c0-5.431 4.402-9.864 9.831-9.864 5.43 0 9.864 4.433 9.864 9.864 0 2.646-1.059 5.088-2.838 6.857a9.825 9.825 0 01-3.46 2.238 9.824 9.824 0 01-3.556.93" />
    </svg>
  ),
  INSTAGRAM: (
    <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-.129-.128-.547-.21-4.947-.21zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  EMAIL: (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  SMS: (
    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  CHAT: (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

export function ConversationView({ conversation, onSendMessage, onStatusChange, onClose }: ConversationViewProps) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: () => api.get<Message[]>(`/conversations/${conversation.id}/messages`),
    refetchInterval: 5000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    onSendMessage(newMessage, conversation.channel);
    setNewMessage('');
    setSending(false);
  };

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return format(date, 'HH:mm');
    }
    return format(date, 'dd/MM HH:mm');
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: Record<string, Message[]> = {};
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const messageGroups = messages ? groupMessagesByDate(messages) : {};

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            {channelIcons[conversation.channel] || channelIcons.CHAT}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {conversation.contactName || 'Contacto'}
            </h3>
            <p className="text-sm text-gray-500">{conversation.contactPhone || conversation.contactEmail || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={conversation.status}
            onChange={(e) => onStatusChange(e.target.value as Conversation['status'])}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 ${statusColors[conversation.status]}`}
          >
            <option value="OPEN">Abierta</option>
            <option value="PENDING">Pendiente</option>
            <option value="CLOSED">Cerrada</option>
            <option value="ESCALATED">Escalada</option>
            <option value="BOT">Bot</option>
            <option value="HUMAN">Humano</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={messagesEndRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex justify-start">
                <div className="max-w-[70%] bg-gray-100 rounded-2xl px-4 py-2 rounded-bl-md">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          Object.entries(messageGroups).map(([date, dayMessages]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex-1 border-t border-gray-200" />
                <span className="px-2 py-0.5 bg-gray-100 rounded">
                  {new Date(date).toDateString() === new Date().toDateString() ? 'Hoy' : format(new Date(date), 'dd MMM yyyy')}
                </span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              {dayMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.direction === 'OUTBOUND'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    {msg.mediaUrl && (
                      <div className="mb-2">
                        {msg.mediaType === 'IMAGE' && (
                          <img src={msg.mediaUrl} alt="Adjunto" className="max-w-xs rounded-lg" />
                        )}
                        {msg.mediaType !== 'IMAGE' && (
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                            Ver adjunto ({msg.mediaType})
                          </a>
                        )}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${msg.direction === 'OUTBOUND' ? 'text-primary-100' : 'text-gray-500'}`}>
                        {formatTime(msg.createdAt)}
                      </span>
                      {msg.direction === 'OUTBOUND' && (
                        <span className={`text-xs ${msg.status === 'SENT' ? 'text-green-300' : msg.status === 'DELIVERED' ? 'text-blue-300' : msg.status === 'READ' ? 'text-purple-300' : 'text-red-300'}`}>
                          {msg.status === 'SENT' ? '✓' : msg.status === 'DELIVERED' ? '✓✓' : msg.status === 'READ' ? '✓✓' : '✗'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            No hay mensajes aún. Inicia la conversación abajo.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500 mb-2">Respuestas rápidas:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Hola, ¿en qué puedo ayudarte?',
            'Gracias por contactarnos',
            'Te envío la información del vehículo',
            '¿Te gustaría agendar una prueba de manejo?',
            'Quedo a la espera de tu respuesta',
          ].map((reply, i) => (
            <button
              key={i}
              onClick={() => handleQuickReply(reply)}
              className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-primary-300 transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(e))}
              placeholder="Escribe un mensaje..."
              className="input-field pr-10"
              disabled={sending}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-primary px-6"
          >
            {sending ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}