import { useEffect, useRef } from 'react';
import { AnalysisMessage } from '@/components/analysis/AnalysisMessage';
import type { ChatMessage } from '@/types/analysis';

export function AnalysisChat({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="analysis-chat">
      {messages.map((m) => (
        <AnalysisMessage key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
