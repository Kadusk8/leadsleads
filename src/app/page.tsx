
"use client";

import { useState, useEffect } from 'react';
import type React from 'react';
import { ChatInterface, type Message } from '@/components/chat/ChatInterface';
import { DataTable } from '@/components/data/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Github, AlertTriangle } from 'lucide-react'; // Placeholder for app icon

export default function WebhookChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tableData, setTableData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const webhookUrl = 'https://n8n.automacaocomia.pro/webhook-test/292392d1-5d1c-40b6-bf11-ddbd968a0ff7';

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setTableData([]); 

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, sentAt: new Date().toISOString() }),
      });

      let responseBodyText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseBodyText);
      } catch (e) {
        // If not JSON, treat as plain text
        responseData = { rawResponse: responseBodyText };
      }

      if (!response.ok) {
        let errorDetail = `Status: ${response.status}. `;
        if (typeof responseData === 'object' && responseData !== null && responseData.message) {
          errorDetail += responseData.message;
        } else if (responseBodyText) {
           errorDetail += `Response: ${responseBodyText.substring(0, 100)}${responseBodyText.length > 100 ? '...' : ''}`;
        }
        throw new Error(`Webhook request failed: ${errorDetail}`);
      }
      
      let botText: string | React.ReactNode = "Received data. See table below.";
      let newTableData: Record<string, any>[] = [];

      let dataToProcess = responseData;
      // Check for common n8n structure (payload often in 'body' or 'data' if it's a test webhook just echoing)
      if (responseData && typeof responseData === 'object') {
         if ('body' in responseData && (typeof responseData.body === 'object' || Array.isArray(responseData.body))) {
            dataToProcess = responseData.body;
         } else if ('data' in responseData && (typeof responseData.data === 'object' || Array.isArray(responseData.data))) {
           dataToProcess = responseData.data;
         }
      }


      if (Array.isArray(dataToProcess)) {
        newTableData = dataToProcess.filter(item => typeof item === 'object' && item !== null);
        if (newTableData.length === 0 && dataToProcess.length > 0) {
          botText = (
            <div>
              <p>Webhook returned an array of non-tabular data:</p>
              <ul className="list-disc pl-5 mt-1 text-xs">
                {dataToProcess.slice(0, 5).map((item, idx) => <li key={idx}>{String(item)}</li>)}
                {dataToProcess.length > 5 && <li>...and {dataToProcess.length - 5} more items.</li>}
              </ul>
            </div>
          );
        } else if (newTableData.length === 0) {
          botText = "Webhook returned an empty array or an array without objects.";
        }
      } else if (typeof dataToProcess === 'object' && dataToProcess !== null) {
        // If it's a single object, check if it primarily contains the input message.
        // This is to avoid showing the echoed input as the main table data if other data is minimal.
        const keys = Object.keys(dataToProcess);
        if (keys.length === 1 && keys[0] === 'message' && dataToProcess.message === messageText) {
             botText = "Webhook acknowledged the message. No distinct tabular data returned.";
        } else if (keys.includes('message') && dataToProcess.message === messageText && keys.length <= 3) {
            // If the object mainly echoes the message with few other fields, just acknowledge
            botText = "Webhook acknowledged the message. See details in table if available.";
            newTableData = [dataToProcess];
        } else {
            newTableData = [dataToProcess];
        }
      } else {
        botText = `Webhook response: ${String(dataToProcess)}`;
      }
      
      setTableData(newTableData);

      const botMessage: Message = {
        id: Date.now().toString() + '-bot',
        text: botText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error('Webhook error:', error);
      let displayErrorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          displayErrorMessage = 'Failed to connect to the webhook server. This could be due to a network issue, the server being temporarily unavailable, or a CORS configuration problem on the server. Please check your internet connection and try again. If the issue persists, the webhook server administrator may need to be contacted.';
        } else {
          displayErrorMessage = error.message;
        }
      }
      
      const botErrorMessage: Message = {
        id: Date.now().toString() + '-bot-error',
        text: (
          <div className="text-destructive-foreground bg-destructive p-2 rounded-md">
            <h4 className="font-semibold flex items-center"><AlertTriangle className="w-4 h-4 mr-1.5"/>Error Processing Request</h4>
            <p className="text-xs mt-0.5">{displayErrorMessage}</p>
          </div>
        ),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botErrorMessage]);
      toast({
        title: "Webhook Error",
        description: displayErrorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-start p-4 md:p-8 bg-background">
      <header className="w-full max-w-4xl mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-10 w-10 text-primary"><rect width="256" height="256" fill="none"/><path d="M128,24a104,104,0,0,0,0,208c24.1,0,46.5-8.5,64-23.1V176H152a24,24,0,0,1-24-24V112a24,24,0,0,1,24-24h40V58.6A103.2,103.2,0,0,0,128,24Z" opacity="0.2" fill="currentColor"/><path d="M128,24a104,104,0,0,0,0,208c24.1,0,46.5-8.5,64-23.1V176H152a24,24,0,0,1-24-24V112a24,24,0,0,1,24-24h40V58.6A103.2,103.2,0,0,0,128,24Zm0,16c52.2,0,88,30.8,88,72s-35.8,72-88,72S40,157.2,40,112,75.8,40,128,40Zm64,48v32H152a24,24,0,0,0-24,24v40a24,24,0,0,0,24,24h40v25.4c-16.8,13.8-38,22.6-61.3,22.6a88.1,88.1,0,0,1-64.4-28.3,85.4,85.4,0,0,1-19.4-60.1,85.4,85.4,0,0,1,19.4-60.1A88.1,88.1,0,0,1,130.7,58,88.4,88.4,0,0,1,192,88Z" fill="currentColor"/></svg>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Webhook Data Exporter</h1>
        </div>
        <p className="text-muted-foreground text-sm md:text-base">
          Send messages to a webhook and visualize the response. Download data as CSV.
        </p>
      </header>
      
      <div className="w-full max-w-4xl grid grid-cols-1 gap-6">
        <Card className="shadow-xl overflow-hidden h-[60vh] md:h-[calc(100vh-250px)] max-h-[700px] flex flex-col">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
        </Card>

        {(tableData.length > 0 || isLoading) && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Webhook Response Data</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={tableData} isLoading={isLoading} />
            </CardContent>
          </Card>
        )}
      </div>
       <footer className="w-full max-w-4xl mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear !== null ? currentYear : ''} Webhook Data Exporter. Built with Next.js and ShadCN UI.</p>
      </footer>
    </div>
  );
}
