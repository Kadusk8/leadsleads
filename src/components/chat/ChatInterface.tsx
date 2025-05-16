"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { Separator } from '@/components/ui/separator';

export interface Message {
  id: string;
  text: string | React.ReactNode;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (messageText: string) => void;
  isLoading: boolean;
}

export function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow p-4 pr-2" ref={scrollAreaRef}>
        <div className="space-y-2">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              text={msg.text}
              sender={msg.sender}
              timestamp={msg.timestamp}
            />
          ))}
        </div>
      </ScrollArea>
      <Separator />
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t">
        <Input
          type="text"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-grow bg-input focus-visible:ring-ring"
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <Button type="submit" disabled={isLoading || !inputValue.trim()} aria-label="Send message">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendHorizontal className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
