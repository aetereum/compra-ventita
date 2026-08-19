'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Conversation, Message, PaginatedResponse } from '@automotive-ai-saas/types';
import { format } from 'date-fns';
import { ConversationList } from '@/components/conversations/ConversationList';
import { ConversationView } from '@/components/conversations/ConversationView';

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['conversations', searchQuery, statusFilter, channelFilter],
    queryFn: () => api.get<PaginatedResponse<Conversation>>('/conversations', {
      params: { 
        search: searchQuery, 
        status: statusFilter !== 'all' ? statusFilter : undefined,
        channel: channelFilter !== 'all' ? channelFilter : undefined,
        limit: 50 
      }
    }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content, channel }: { conversationId: string; content: string; channel: string }) =>
      api.post<Message>(`/conversations/${conversationId}/messages`, { content, channel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ conversationId, status }: { conversationId: string; status: Conversation['status'] }) =>
      api.patch<Conversation>(`/conversations/${conversationId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (selectedConversation) {
        setSelectedConversation({ ...selectedConversation, status });
      }
    },
  });

  const handleSendMessage = (content: string, channel: string) => {
    if (!selectedConversation || !content.trim()) return;
    sendMessageMutation.mutate({ conversationId: selectedConversation.id, content, channel });
  };

  const handleStatusChange = (status: Conversation['status']) => {
    if (selectedConversation && selectedConversation.status !== status) {
      updateStatusMutation.mutate({ conversationId: selectedConversation.id, status });
    }
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="h-[calc(100vh-200px)] flex">
      {/* Conversations List */}
      <div className="w-full lg:w-96 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversaciones</h2>
          
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field flex-1 text-sm"
            >
              <option value="all">Todos</option>
              <option value="OPEN">Abiertas</option>
              <option value="PENDING">Pendientes</option>
              <option value="CLOSED">Cerradas</option>
              <option value="ESCALATED">Escaladas</option>
              <option value="BOT">Bot</option>
              <option value="HUMAN">Humano</option>
            </select>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="input-field flex-1 text-sm"
            >
              <option value="all">Todos</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="CHAT">Chat Web</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse p-3 border-b border-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : conversationsData?.data.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="mt-2">No hay conversaciones</p>
            </div>
          ) : (
            <ConversationList
              conversations={conversationsData.data}
              selectedConversation={selectedConversation}
              onSelect={setSelectedConversation}
            />
          )}
        </div>
      </div>

      {/* Conversation View */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <ConversationView
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
            onStatusChange={handleStatusChange}
            onClose={handleCloseConversation}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Selecciona una conversación</h3>
              <p className="mt-1 text-gray-500">Elige una conversación de la lista para comenzar a chatear</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}