import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Lock } from 'lucide-react';
import { ChatLogo } from '../components/ChatLogo';
import { messengerApi } from '../api';
import { ChatView } from '../components/ChatView';
import { ConversationList } from '../components/ConversationList';
import { NewChatModal } from '../components/dialogs';
import { InfoPanel } from '../components/InfoPanel';
import { conversationPath, msgKeys, useMessenger } from '../MessengerContext';
import type { Conversation } from '../types';

export const MessengerPage: React.FC = () => {
  const { conversationId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { conversations, isLoading, isError, reload } = useMessenger();
  const [infoOpen, setInfoOpen] = useState(false);
  const [modal, setModal] = useState<'chat' | 'group' | null>(null);
  const [missing, setMissing] = useState(false);

  // The address holds an opaque id; the database number only exists inside the app.
  const ref = conversationId ?? null;
  const conversation = ref ? conversations.find((c) => c.public_id === ref) : undefined;
  const id = conversation?.conversation_id ?? null;
  const selected = ref !== null;
  const jumpTo = search.get('m') ? Number(search.get('m')) : null;

  const open = useCallback(
    (cid: number, messageId?: number) => navigate(conversationPath(qc.getQueryData<Conversation[]>(msgKeys.conversations), cid, messageId)),
    [navigate, qc],
  );

  // A conversation that is not in the list yet (just created, or an old numeric link): ask the server what it is.
  useEffect(() => {
    setMissing(false);
    if (!ref || conversation || isLoading || isError) return;
    let live = true;
    messengerApi
      .resolve(ref)
      .then(async (c) => {
        if (!live) return;
        await qc.invalidateQueries({ queryKey: msgKeys.conversations });
        navigate(`/messenger/${c.public_id}${search.toString() ? `?${search.toString()}` : ''}`, { replace: true });
      })
      .catch(() => live && setMissing(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, conversation, isLoading, isError, qc, navigate]);

  useEffect(() => setInfoOpen(false), [id]);

  const openDirect = useCallback(
    async (empId: number) => {
      const c = await messengerApi.openDirect(empId);
      await qc.invalidateQueries({ queryKey: msgKeys.conversations });
      setInfoOpen(false);
      navigate(`/messenger/${c.public_id}`);
    },
    [navigate, qc],
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] min-h-[420px] w-full max-w-[1600px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm max-sm:-mx-4 max-sm:-mb-8 max-sm:-mt-5 max-sm:h-[calc(100dvh-64px)] max-sm:w-auto max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:shadow-none">
      <aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-slate-200 md:w-[340px] md:border-r lg:w-[400px]`}>
        <ConversationList selectedId={id} onSelect={open} onOpenDirect={openDirect} onNew={setModal} />
      </aside>

      <section key={ref ?? 'none'} className={`${selected ? 'flex' : 'hidden md:flex'} msg-fade min-w-0 flex-1`}>
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#f0f2f5] px-8 text-center">
            <ChatLogo size={128} />
            <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Vernoxy Messenger</h2>
            <p className="max-w-md text-sm text-slate-500">Send and receive messages, share files and stay in sync with your team without leaving Vernoxy Pulse.</p>
            <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400"><Lock className="h-3 w-3" /> Chats are private to the people in them</p>
          </div>
        ) : conversation ? (
          <>
            <ChatView
              key={conversation.conversation_id}
              conversation={conversation}
              jumpTo={jumpTo}
              infoOpen={infoOpen}
              onBack={() => navigate('/messenger')}
              onToggleInfo={() => setInfoOpen((v) => !v)}
            />
            {infoOpen && (
              <>
                <div className="msg-fade fixed inset-0 z-[55] bg-slate-900/40 xl:hidden" onClick={() => setInfoOpen(false)} aria-hidden />
                <div className="msg-panel fixed inset-y-0 right-0 z-[60] w-full max-w-sm shadow-2xl xl:static xl:z-auto xl:w-[360px] xl:max-w-none xl:shrink-0 xl:border-l xl:border-slate-200 xl:shadow-none">
                  <InfoPanel
                    conversation={conversation}
                    onClose={() => setInfoOpen(false)}
                    onOpenDirect={openDirect}
                    onLeft={() => navigate('/messenger')}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#f0f2f5] px-8 text-center">
            {isError ? (
              <>
                <p className="text-sm font-semibold text-slate-700">Could not load your chats.</p>
                <p className="text-xs text-slate-500">Check your connection and try again.</p>
                <button type="button" onClick={reload} className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338CA]">Retry</button>
              </>
            ) : missing ? (
              <>
                <p className="text-sm font-semibold text-slate-700">This conversation is not available.</p>
                <button type="button" onClick={() => navigate('/messenger')} className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white">Back to chats</button>
              </>
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            )}
          </div>
        )}
      </section>

      {modal && (
        <NewChatModal
          initialTab={modal}
          onClose={() => setModal(null)}
          onOpenConversation={async (cid) => {
            setModal(null);
            await qc.invalidateQueries({ queryKey: msgKeys.conversations });
            open(cid);
          }}
        />
      )}
    </div>
  );
};
