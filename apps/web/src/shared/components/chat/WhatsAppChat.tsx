import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  AtSign,
  CheckCheck,
  MessageSquare,
  Users,
} from 'lucide-react';

export interface ChatMessage {
  message_id: number | string;
  sender_emp_id?: number;
  sender_id?: number;
  sender_name: string;
  message: string;
  created_at: string;
  attachments?: string[];
}

export interface ChatMember {
  employee_id: number;
  name: string;
  email?: string;
  role_in_project?: string;
  avatar?: string;
}

export interface WhatsAppChatProps {
  title?: string;
  subtitle?: string;
  messages: ChatMessage[];
  currentUserId?: number;
  members?: ChatMember[];
  onSendMessage: (message: string, taggedEmployeeIds: number[]) => Promise<void> | void;
  isLoading?: boolean;
  placeholder?: string;
  heightClass?: string;
}

// Consistent WhatsApp-style colors for sender names in group discussions
const SENDER_COLORS = [
  'text-emerald-700',
  'text-blue-700',
  'text-indigo-700',
  'text-purple-700',
  'text-amber-700',
  'text-rose-700',
  'text-cyan-700',
  'text-teal-700',
];

function getSenderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SENDER_COLORS.length;
  return SENDER_COLORS[index];
}

// Group messages by human readable date
function formatDatePill(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({
  title = 'Project Discussion',
  subtitle = 'Team real-time chat & updates',
  messages,
  currentUserId,
  members = [],
  onSendMessage,
  isLoading = false,
  placeholder = 'Type a message... (click @ or type @ to tag members)',
  heightClass = 'h-[540px]',
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [selectedTaggedIds, setSelectedTaggedIds] = useState<number[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: ChatMessage[] }> = [];
    let currentDateLabel = '';
    let currentGroup: ChatMessage[] = [];

    messages.forEach((msg) => {
      const label = formatDatePill(msg.created_at);
      if (label !== currentDateLabel) {
        if (currentGroup.length > 0) {
          groups.push({ dateLabel: currentDateLabel, items: currentGroup });
        }
        currentDateLabel = label;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentDateLabel, items: currentGroup });
    }

    return groups;
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close tag popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        tagMenuRef.current &&
        !tagMenuRef.current.contains(e.target as Node)
      ) {
        setShowTagMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter members for @ mention popover
  const filteredMembers = useMemo(() => {
    if (!tagQuery) return members;
    const q = tagQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.role_in_project && m.role_in_project.toLowerCase().includes(q))
    );
  }, [members, tagQuery]);

  // Input change handler supporting `@` typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Detect if user is currently typing after an '@'
    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex >= val.length - 20) {
      const query = val.slice(lastAtIndex + 1);
      if (!query.includes(' ')) {
        setTagQuery(query);
        setShowTagMenu(true);
        return;
      }
    }
    setShowTagMenu(false);
  };

  // Select tagged member from dropdown
  const handleSelectMember = (member: ChatMember) => {
    const lastAtIndex = inputText.lastIndexOf('@');
    let prefix = inputText;
    if (lastAtIndex !== -1) {
      prefix = inputText.slice(0, lastAtIndex);
    }
    const updatedText = `${prefix}@${member.name} `;
    setInputText(updatedText);
    setSelectedTaggedIds((prev) =>
      prev.includes(member.employee_id) ? prev : [...prev, member.employee_id]
    );
    setShowTagMenu(false);
    inputRef.current?.focus();
  };

  // Submit message
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSubmitting) return;

    // Detect all tagged employee IDs matching @Name in message text
    const finalTaggedIds = new Set<number>(selectedTaggedIds);
    members.forEach((m) => {
      if (trimmed.toLowerCase().includes(`@${m.name.toLowerCase()}`)) {
        finalTaggedIds.add(m.employee_id);
      }
    });

    try {
      setIsSubmitting(true);
      await onSendMessage(trimmed, Array.from(finalTaggedIds));
      setInputText('');
      setSelectedTaggedIds([]);
      setShowTagMenu(false);
    } catch (err) {
      console.error('Failed to send chat message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render message text with highlighted @mentions
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(@[\w\s.-]+(?:\b|$))/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const candidateName = part.slice(1).trim().toLowerCase();
        const matchedMember = members.find(
          (m) =>
            m.name.toLowerCase() === candidateName ||
            m.name.toLowerCase().startsWith(candidateName)
        );
        if (matchedMember || part.length > 1) {
          return (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] shadow-2xs mx-0.5 border border-blue-200"
            >
              {part}
            </span>
          );
        }
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col ${heightClass} overflow-hidden`}>
      {/* WhatsApp Chat Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 tracking-tight">{title}</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active Channel" />
            </div>
            <p className="text-[10px] text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
      </div>

      {/* WhatsApp Chat Messages Stream with Wallpaper Feel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2]/45">
        {groupedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
            <div className="w-12 h-12 rounded-full bg-white/80 border border-slate-200/80 flex items-center justify-center mb-2 shadow-2xs">
              <MessageSquare className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-700">No messages yet</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
              Start the discussion! Type a message or click <span className="font-mono font-bold text-blue-600">@</span> to tag team members.
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.dateLabel} className="space-y-3">
              {/* WhatsApp Date Separator Pill */}
              <div className="flex items-center justify-center my-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white/95 px-3 py-0.5 rounded-full border border-slate-200 shadow-2xs backdrop-blur-xs">
                  {group.dateLabel}
                </span>
              </div>

              {/* Message Bubbles */}
              {group.items.map((msg) => {
                // Support both sender_emp_id (from API) and sender_id
                const senderEmpId = (msg as any).sender_emp_id ?? msg.sender_id;
                const isMe =
                  Boolean(currentUserId && senderEmpId && Number(senderEmpId) === Number(currentUserId)) ||
                  msg.sender_name?.toLowerCase().includes('you') ||
                  false;

                const nameColor = getSenderColor(msg.sender_name);

                return (
                  <div
                    key={msg.message_id}
                    className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Receiver Avatar (if other user) */}
                    {!isMe && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] shrink-0 mb-1 border border-slate-300/80 shadow-2xs">
                        {msg.sender_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Chat Bubble: Right side (green) for current user, Left side (white) for others */}
                    <div
                      className={`relative max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-2xs transition-all duration-150 ${
                        isMe
                          ? 'ml-auto bg-[#d9fdd3] text-slate-900 rounded-tr-xs border border-[#b2e2a8]/60'
                          : 'mr-auto bg-white text-slate-900 rounded-tl-xs border border-slate-200/90'
                      }`}
                    >
                      {/* Sender Name in Group Chat */}
                      {!isMe && (
                        <div className={`text-[10px] font-extrabold mb-1 tracking-tight ${nameColor}`}>
                          {msg.sender_name}
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                        {renderFormattedText(msg.message)}
                      </div>

                      {/* Time & Double Checkmark for Sent Messages */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-500 font-medium select-none">
                        <span>{formatTime(msg.created_at)}</span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.2]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Tag Suggestion Popover */}
      {showTagMenu && (
        <div
          ref={tagMenuRef}
          className="mx-4 mb-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150 z-30"
        >
          <div className="px-2 py-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100">
            <Users className="w-3 h-3 text-blue-600" />
            <span>Tag Member (Notifies Only Them)</span>
          </div>
          {filteredMembers.length === 0 ? (
            <div className="p-2 text-xs text-slate-400 text-center">No matching team members</div>
          ) : (
            filteredMembers.map((member) => (
              <button
                key={member.employee_id}
                type="button"
                onClick={() => handleSelectMember(member)}
                className="w-full text-left p-2 hover:bg-blue-50/80 rounded-xl flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] group-hover:bg-blue-600 group-hover:text-white transition">
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                      @{member.name}
                    </div>
                    {member.email && (
                      <div className="text-[10px] text-slate-400">{member.email}</div>
                    )}
                  </div>
                </div>
                {member.role_in_project && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {member.role_in_project}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* WhatsApp Input Controls Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        {/* Tag / Mention Button */}
        <button
          type="button"
          onClick={() => {
            setShowTagMenu((prev) => !prev);
            setTagQuery('');
          }}
          className={`p-2 rounded-xl transition cursor-pointer ${
            showTagMenu ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
          }`}
          title="Tag Team Member (@)"
        >
          <AtSign className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={isLoading || isSubmitting}
          className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-200/90 rounded-2xl focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs font-medium placeholder:text-slate-400"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isSubmitting || isLoading}
          className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shadow-xs transition cursor-pointer shrink-0"
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
