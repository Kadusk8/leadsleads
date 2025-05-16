
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { ChatInterface, type Message } from '@/components/chat/ChatInterface';
import { DataTable } from '@/components/data/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, WebhookIcon } from 'lucide-react';

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

    const thinkingMessage: Message = {
      id: Date.now().toString() + '-bot-thinking',
      text: (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Consultando informações e processando sua solicitação... Isso pode levar alguns instantes. ⌛</span>
        </div>
      ),
      sender: 'bot',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
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
        responseData = { rawResponse: responseBodyText };
      }

      setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== thinkingMessage.id));

      if (!response.ok) {
        let errorDetail = `Status: ${response.status}. `;
        if (typeof responseData === 'object' && responseData !== null && responseData.message) {
          errorDetail += responseData.message;
        } else if (responseBodyText) {
           errorDetail += `Resposta: ${responseBodyText.substring(0, 100)}${responseBodyText.length > 100 ? '...' : ''}`;
        }
        throw new Error(`Falha na requisição ao webhook: ${errorDetail}`);
      }
      
      let botText: string | React.ReactNode = "Recebemos os dados. Veja a tabela abaixo.";
      let newTableData: Record<string, any>[] = [];

      let dataToProcess = responseData;
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
              <p>O webhook retornou uma lista de dados não tabulares:</p>
              <ul className="list-disc pl-5 mt-1 text-xs">
                {dataToProcess.slice(0, 5).map((item, idx) => <li key={idx}>{String(item)}</li>)}
                {dataToProcess.length > 5 && <li>...e mais {dataToProcess.length - 5} itens.</li>}
              </ul>
            </div>
          );
        } else if (newTableData.length === 0) {
          botText = "O webhook retornou uma lista vazia ou sem objetos para a tabela.";
        }
      } else if (typeof dataToProcess === 'object' && dataToProcess !== null) {
        const keys = Object.keys(dataToProcess);
        if (keys.length === 1 && keys[0] === 'message' && dataToProcess.message === messageText) {
             botText = "O webhook confirmou o recebimento da sua mensagem. Nenhum dado tabular distinto foi retornado.";
        } else if (keys.includes('message') && dataToProcess.message === messageText && keys.length <= 3) {
            botText = "O webhook confirmou o recebimento da sua mensagem. Veja detalhes na tabela, se disponíveis.";
            newTableData = [dataToProcess];
        } else {
            newTableData = [dataToProcess];
        }
      } else {
        botText = `Resposta do webhook: ${String(dataToProcess)}`;
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
      console.error('Erro no Webhook:', error);
      setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== thinkingMessage.id));

      let displayErrorMessage = 'Ocorreu um erro desconhecido.';
      if (error instanceof Error) {
        if (error.message.startsWith('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Falha na requisição ao webhook')) {
          displayErrorMessage = 'Falha ao conectar ao servidor do webhook. Isso pode ser devido a um problema de rede, o servidor estar temporariamente indisponível ou um problema de configuração CORS no servidor. Por favor, verifique sua conexão com a internet e tente novamente. Se o problema persistir, o administrador do servidor do webhook pode precisar ser contatado.';
        } else {
          displayErrorMessage = error.message;
        }
      }
      
      const botErrorMessage: Message = {
        id: Date.now().toString() + '-bot-error',
        text: (
          <div className="text-destructive-foreground bg-destructive p-3 rounded-lg shadow-md">
            <h4 className="font-semibold flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/>Erro ao Processar Solicitação</h4>
            <p className="text-sm mt-1">{displayErrorMessage}</p>
          </div>
        ),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botErrorMessage]);
      toast({
        title: "Erro no Webhook",
        description: displayErrorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-start p-4 pt-8 md:p-8 md:pt-12 bg-background">
      <header className="w-full max-w-4xl mb-10 text-center">
        <div className="flex flex-col items-center justify-center gap-3 mb-4">
          <WebhookIcon className="h-12 w-12 text-primary" />
          <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight">
            Exportador de Dados via Webhook
          </h1>
        </div>
        <p className="text-md md:text-lg text-muted-foreground max-w-xl mx-auto">
          Envie seus comandos via chat para interagir com o webhook, visualizar os resultados e exportar os dados facilmente.
        </p>
      </header>
      
      <div className="w-full max-w-4xl grid grid-cols-1 gap-8">
        <Card className="shadow-xl overflow-hidden h-[60vh] md:h-[calc(100vh-300px)] max-h-[650px] flex flex-col rounded-lg">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
        </Card>

        {(tableData.length > 0 || isLoading) && (
          <Card className="shadow-xl rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-foreground">Dados da Resposta do Webhook</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={tableData} isLoading={isLoading} />
            </CardContent>
          </Card>
        )}
      </div>
       <footer className="w-full max-w-4xl mt-16 mb-8 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear !== null ? currentYear : '....'} Exportador de Dados via Webhook. Todos os direitos reservados.</p>
        <p>Construído com Next.js e ShadCN UI.</p>
      </footer>
    </div>
  );
}
