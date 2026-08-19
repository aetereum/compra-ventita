'use client';

import { Conversation } from '@automotive-ai-saas/types';
import { format } from 'date-fns';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
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

export function ConversationList({ conversations, selectedConversation, onSelect }: ConversationListProps) {
  return (
    <div className="divide-y divide-gray-100">
      {conversations.map(conversation => (
        <button
          key={conversation.id}
          onClick={() => onSelect(conversation)}
          className={`w-full p-3 text-left transition-colors ${
            selectedConversation?.id === conversation.id
              ? 'bg-primary-50 border-r-2 border-primary-500'
              : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              {channelIcons[conversation.channel] || channelIcons.CHAT}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 truncate">
                  {conversation.contactName || 'Contacto'}
                </h4>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColors[conversation.status] || 'bg-gray-100 text-gray-800'}`}>
                  {statusLabels[conversation.status] || conversation.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate mt-1">
                {conversation.lastMessageContent || 'Sin mensajes'}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{format(new Date(conversation.updatedAt), 'dd/MM HH:mm')}</span>
                {conversation.unreadCount > 0 && (
                  <span className="bg-primary-600 text-white px-1.5 py-0.5 rounded-full text-xs">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}