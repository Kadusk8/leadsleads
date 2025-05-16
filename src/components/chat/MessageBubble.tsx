"use client";

import type React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  text: string | React.ReactNode;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function MessageBubble({ text, sender, timestamp }: MessageBubbleProps) {
  const isUser = sender === 'user';

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 py-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <Bot className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-3 shadow-md',
          isUser
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-card text-card-foreground border'
        )}
      >
        {typeof text === 'string' ? <p className="text-sm whitespace-pre-wrap break-words">{text}</p> : text}
        <p className={cn("text-xs mt-1", isUser ? "text-secondary-foreground/70 text-right" : "text-muted-foreground/70 text-left")}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
         <Avatar className="h-8 w-8">
          <AvatarFallback>
            <User className="h-5 w-5 text-secondary-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
