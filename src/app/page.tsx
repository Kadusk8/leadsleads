
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
        // If parsing fails, treat it as a raw text response
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

      // Prioritize 'body' or 'data' keys if responseData is an object
      if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          if (('body' in responseData) && (typeof responseData.body === 'object' || Array.isArray(responseData.body))) {
              dataForTableProcessing = responseData.body;
          } else if (('data' in responseData) && (typeof responseData.data === 'object' || Array.isArray(responseData.data))) {
              dataForTableProcessing = responseData.data;
          }
      }
      
      if (Array.isArray(dataForTableProcessing)) {
          if (dataForTableProcessing.length > 0) {
              const firstItem = dataForTableProcessing[0];
              if (typeof firstItem === 'object' && firstItem !== null) {
                  // Array of objects, good for table
                  newTableData = dataForTableProcessing.filter(item => typeof item === 'object' && item !== null);
                  if (newTableData.length > 0) {
                     botResponseMessage = `Recebemos ${newTableData.length} ${newTableData.length === 1 ? 'registro tabular' : 'registros tabulares'}. Veja a tabela abaixo.`;
                  } else {
                     // This case should be rare if firstItem was an object, but good to have
                     botResponseMessage = "O webhook retornou uma lista de objetos, mas após a filtragem, não restaram dados válidos para a tabela.";
                  }
              } else if (['string', 'number', 'boolean'].includes(typeof firstItem)) {
                  // Array of simple items (strings, numbers, booleans)
                  newTableData = dataForTableProcessing.map(item => ({ Item: item }));
                  botResponseMessage = `Recebemos uma lista com ${newTableData.length} ${newTableData.length === 1 ? 'item simples' : 'itens simples'}. Veja a tabela abaixo.`;
              } else {
                  // Array of something else (e.g., array of arrays, mixed types not easily tabular)
                  botResponseMessage = (
                      <div>
                          <p>O webhook retornou uma lista, mas seu conteúdo não é diretamente tabular (objetos) nem uma lista simples (texto/números) para exibição direta:</p>
                          <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">{JSON.stringify(dataForTableProcessing.slice(0,5), null, 2)}</pre>
                          {dataForTableProcessing.length > 5 && <p className="text-xs mt-1">...e mais {dataForTableProcessing.length - 5} itens.</p>}
                      </div>
                  );
              }
          } else {
              botResponseMessage = "O webhook retornou uma lista vazia.";
          }
      } else if (typeof dataForTableProcessing === 'object' && dataForTableProcessing !== null) {
          // It's an object, let's see if any of its properties is an array of objects
          let foundArrayInObject = false;
          for (const key in dataForTableProcessing) {
              if (Array.isArray(dataForTableProcessing[key])) {
                  const currentArray = dataForTableProcessing[key];
                  if (currentArray.length > 0) {
                      const firstItem = currentArray[0];
                      if (typeof firstItem === 'object' && firstItem !== null) {
                          newTableData = currentArray.filter((item: any) => typeof item === 'object' && item !== null);
                           if (newTableData.length > 0) {
                            botResponseMessage = `Encontramos ${newTableData.length} ${newTableData.length === 1 ? 'registro tabular' : 'registros tabulares'} na chave '${key}'. Veja a tabela abaixo.`;
                            foundArrayInObject = true;
                            break; // Use the first array of objects found
                           }
                      } else if (['string', 'number', 'boolean'].includes(typeof firstItem)) {
                          // Array of simple items (strings, numbers, booleans)
                          newTableData = currentArray.map((item: any) => ({ Item: item }));
                          botResponseMessage = `Encontramos uma lista com ${newTableData.length} ${newTableData.length === 1 ? 'item simples' : 'itens simples'} na chave '${key}'. Veja a tabela abaixo.`;
                          foundArrayInObject = true;
                          break;
                      } else {
                         // Array of something else within the object
                         botResponseMessage = (
                            <div>
                                <p>O webhook retornou uma lista (na chave '{key}'), mas seu conteúdo não é diretamente tabular (objetos) nem uma lista simples (texto/números) para exibição direta:</p>
                                <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">{JSON.stringify(currentArray.slice(0,5), null, 2)}</pre>
                                {currentArray.length > 5 && <p className="text-xs mt-1">...e mais {currentArray.length - 5} itens.</p>}
                            </div>
                        );
                        newTableData = []; // Don't show non-tabular array in table
                        foundArrayInObject = true; // still "found an array", just not one we can table easily
                        break;
                      }
                  } else {
                      botResponseMessage = `A chave '${key}' continha uma lista vazia.`;
                      newTableData = [];
                      foundArrayInObject = true;
                      break;
                  }
              }
          }

          if (!foundArrayInObject) {
              // No array found inside the object, or it was a special case like 'rawResponse'
              if (Object.keys(dataForTableProcessing).length === 1 && dataForTableProcessing.rawResponse && typeof dataForTableProcessing.rawResponse === 'string') {
                  // This is our special case for non-JSON responses
                  botResponseMessage = (
                    <div>
                        <p>O webhook retornou uma resposta de texto não JSON:</p>
                        <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">{dataForTableProcessing.rawResponse.substring(0, 200)}{dataForTableProcessing.rawResponse.length > 200 ? '...' : ''}</pre>
                    </div>
                );
              } else if (Object.keys(dataForTableProcessing).length === 1 && dataForTableProcessing.message && typeof dataForTableProcessing.message === 'string' && dataForTableProcessing.message.toLowerCase().includes(messageText.substring(0,10).toLowerCase())) {
                  // Heuristic: if the only key is "message" and it contains part of the sent text, assume it's a confirmation.
                  botResponseMessage = "O webhook confirmou o recebimento da sua mensagem. Nenhum dado tabular adicional foi retornado.";
              } else {
                  // Treat the object itself as a single row for the table
                  newTableData = [dataForTableProcessing]; 
                  botResponseMessage = "Recebemos um objeto de dados. Veja a tabela abaixo.";
              }
          }
      } else if (dataForTableProcessing !== undefined && dataForTableProcessing !== null) { // Primitive type or null
          // Handle primitive types directly or if it's our rawResponse wrapper
          if (typeof dataForTableProcessing === 'object' && dataForTableProcessing.rawResponse) {
             // This case is for when JSON.parse failed initially.
             botResponseMessage = (
                <div>
                    <p>O webhook retornou uma resposta de texto:</p>
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">{String(dataForTableProcessing.rawResponse).substring(0, 200)}{String(dataForTableProcessing.rawResponse).length > 200 ? '...' : ''}</pre>
                </div>
              );
          } else {
            // For actual primitive types (string, number, boolean) if they somehow get here
            botResponseMessage = `Resposta não tabular do webhook: ${String(dataForTableProcessing)}`;
          }
      } else {
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
          displayErrorMessage = error.message; // The message already contains status and potentially part of the response
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
        <Card className="shadow-xl overflow-hidden h-[60vh] md:h-[calc(100vh-320px)] max-h-[700px] flex flex-col rounded-lg">
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
