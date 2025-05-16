
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
        // Se não for JSON, responseData será o texto bruto
        responseData = { rawResponse: responseBodyText };
      }

      setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== thinkingMessage.id));

      if (!response.ok) {
        let errorDetail = `Status: ${response.status}. `;
        if (typeof responseData === 'object' && responseData !== null && responseData.message) {
          errorDetail += responseData.message;
        } else if (responseData && responseData.rawResponse) {
           errorDetail += `Resposta: ${String(responseData.rawResponse).substring(0, 100)}${String(responseData.rawResponse).length > 100 ? '...' : ''}`;
        } else if (responseBodyText) {
           errorDetail += `Resposta: ${responseBodyText.substring(0, 100)}${responseBodyText.length > 100 ? '...' : ''}`;
        }
        throw new Error(`Falha na requisição ao webhook: ${errorDetail}`);
      }
      
      let botResponseMessage: string | React.ReactNode = "Processamos a resposta do webhook.";
      let newTableData: Record<string, any>[] = [];
      let dataForTableProcessing: any = responseData;

      // 1. Tentar descer para 'body' ou 'data' se forem chaves comuns e contiverem objetos/arrays
      // Essas são chaves comuns que o n8n pode usar para encapsular a saída principal.
      if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          if (('body' in responseData) && (typeof responseData.body === 'object' || Array.isArray(responseData.body))) {
              dataForTableProcessing = responseData.body;
          } else if (('data' in responseData) && (typeof responseData.data === 'object' || Array.isArray(responseData.data))) {
              dataForTableProcessing = responseData.data;
          }
      }

      // 2. Processar 'dataForTableProcessing' para newTableData
      if (Array.isArray(dataForTableProcessing)) {
          // É diretamente um array
          newTableData = dataForTableProcessing.filter(item => typeof item === 'object' && item !== null);
          if (newTableData.length > 0) {
              botResponseMessage = `Recebemos ${newTableData.length} ${newTableData.length === 1 ? 'registro' : 'registros'}. Veja a tabela abaixo.`;
          } else if (dataForTableProcessing.length > 0) { // Array, mas não de objetos (ex: array de strings)
              botResponseMessage = (
                  <div>
                      <p>O webhook retornou uma lista de dados, mas não em formato tabular para exibição direta:</p>
                      <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">{JSON.stringify(dataForTableProcessing.slice(0,5), null, 2)}</pre>
                      {dataForTableProcessing.length > 5 && <p className="text-xs mt-1">...e mais {dataForTableProcessing.length - 5} itens.</p>}
                  </div>
              );
          } else { // Array vazio
              botResponseMessage = "O webhook retornou uma lista vazia.";
          }
      } else if (typeof dataForTableProcessing === 'object' && dataForTableProcessing !== null) {
          // É um objeto, procurar um array de objetos dentro dele
          let foundArrayInObject = false;
          for (const key in dataForTableProcessing) {
              if (Array.isArray(dataForTableProcessing[key])) {
                  const potentialArray = dataForTableProcessing[key].filter((item: any) => typeof item === 'object' && item !== null);
                  if (potentialArray.length > 0) {
                      newTableData = potentialArray;
                      botResponseMessage = `Encontramos ${newTableData.length} ${newTableData.length === 1 ? 'registro' : 'registros'} na chave '${key}'. Veja a tabela abaixo.`;
                      foundArrayInObject = true;
                      break; 
                  } else if (dataForTableProcessing[key].length > 0) { // É um array, mas não de objetos, dentro de uma chave
                       botResponseMessage = (
                          <div>
                              <p>O webhook retornou uma lista (na chave '{key}'), mas não em formato tabular para exibição direta:</p>
                              <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">{JSON.stringify(dataForTableProcessing[key].slice(0,5), null, 2)}</pre>
                              {dataForTableProcessing[key].length > 5 && <p className="text-xs mt-1">...e mais {dataForTableProcessing[key].length - 5} itens.</p>}
                          </div>
                      );
                      foundArrayInObject = true; // Previne o fallback para objeto único se encontrarmos um array não tabular
                      break;
                  }
              }
          }

          if (!foundArrayInObject) {
              // Nenhum array tabular encontrado dentro do objeto, ou o objeto não continha arrays.
              // Tratar o objeto 'dataForTableProcessing' como uma única linha, a menos que seja um eco.
              const keys = Object.keys(dataForTableProcessing);
              if (keys.length === 1 && keys[0] === 'message' && typeof dataForTableProcessing.message === 'string' && dataForTableProcessing.message.toLowerCase().includes(messageText.substring(0,10).toLowerCase())) {
                  botResponseMessage = "O webhook confirmou o recebimento da sua mensagem. Nenhum dado tabular adicional foi retornado.";
              } else if (keys.length === 1 && keys[0] === 'rawResponse' && typeof dataForTableProcessing.rawResponse === 'string') {
                  botResponseMessage = (
                    <div>
                        <p>O webhook retornou uma resposta de texto não JSON:</p>
                        <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">{dataForTableProcessing.rawResponse.substring(0, 200)}{dataForTableProcessing.rawResponse.length > 200 ? '...' : ''}</pre>
                    </div>
                );
              } else {
                  newTableData = [dataForTableProcessing]; // Tratar o objeto como uma única linha
                  botResponseMessage = "Recebemos um objeto de dados. Veja a tabela abaixo.";
              }
          }
      } else if (dataForTableProcessing !== undefined && dataForTableProcessing !== null) {
          // Não é array nem objeto (ex: string, número, booleano), mas não é undefined/null.
          // Se for a rawResponse, mostre de forma formatada.
          if (typeof dataForTableProcessing === 'object' && dataForTableProcessing.rawResponse) {
             botResponseMessage = (
                <div>
                    <p>O webhook retornou uma resposta de texto:</p>
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">{String(dataForTableProcessing.rawResponse).substring(0, 200)}{String(dataForTableProcessing.rawResponse).length > 200 ? '...' : ''}</pre>
                </div>
              );
          } else {
            botResponseMessage = `Resposta do webhook: ${String(dataForTableProcessing)}`;
          }
      } else {
          // Resposta foi undefined ou null
          botResponseMessage = "O webhook retornou uma resposta vazia ou inesperada.";
      }
      
      setTableData(newTableData);

      const botMessage: Message = {
        id: Date.now().toString() + '-bot',
        text: botResponseMessage,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error('Erro no Webhook:', error);
      setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== thinkingMessage.id));

      let displayErrorMessage = 'Ocorreu um erro desconhecido.';
      if (error instanceof Error) {
        if (error.message.startsWith('Failed to fetch') || error.message.includes('NetworkError')) {
          displayErrorMessage = 'Falha ao conectar ao servidor do webhook. Verifique sua conexão ou se o servidor está online e configurado para CORS.';
        } else if (error.message.includes('Falha na requisição ao webhook')) {
          displayErrorMessage = error.message;
        } else {
          displayErrorMessage = `Erro ao processar: ${error.message}`;
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
    <div className="flex flex-col min-h-screen items-center justify-start p-4 pt-12 md:p-8 md:pt-16 bg-background">
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
        <Card className="shadow-xl overflow-hidden h-[60vh] md:h-[calc(100vh-320px)] max-h-[700px] flex flex-col rounded-lg"> {/* Increased max-h slightly */}
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
