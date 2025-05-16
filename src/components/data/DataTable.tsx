
"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileWarning, PackageSearch } from 'lucide-react';
import { exportToCsv } from '@/lib/export';
import { Card, CardContent } from '@/components/ui/card';

interface DataTableProps {
  data: Record<string, any>[];
  isLoading: boolean;
}

export function DataTable({ data, isLoading }: DataTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-lg font-medium">Carregando dados...</span>
        <p className="text-sm text-center">Por favor, aguarde enquanto buscamos as informações.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
        <PackageSearch className="h-16 w-16 mb-4 text-primary/70" />
        <p className="text-xl font-semibold">Nenhum Dado Disponível</p>
        <p className="text-sm max-w-xs">O webhook não retornou dados para exibição ou a consulta não gerou resultados.</p>
      </div>
    );
  }

  const headers = Object.keys(data[0] || {});

  const handleDownload = () => {
    exportToCsv('dados_exportados.csv', data);
  };
  
  const renderCellContent = (content: any) => {
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content, null, 2); // Pretty print JSON
    }
    if (typeof content === 'boolean') {
      return content ? 'Sim' : 'Não';
    }
    if (content === null || content === undefined) {
      return '-'; // Placeholder for empty cells
    }
    return String(content);
  };


  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar como CSV
        </Button>
      </div>
      <Card className="overflow-hidden border shadow-lg rounded-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="px-4 py-3 font-semibold text-foreground whitespace-nowrap hover:bg-muted/80 transition-colors">
                      {header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} {/* Prettify header */}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/30 transition-colors data-[state=selected]:bg-primary/10">
                    {headers.map((header) => (
                      <TableCell key={`${rowIndex}-${header}`} className="px-4 py-3 text-sm text-foreground whitespace-pre-wrap break-words max-w-xs"> {/* Allow wrapping */}
                        {renderCellContent(row[header])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
       {data.length > 10 && (
        <TableCaption className="mt-4">Exibindo {data.length} {data.length === 1 ? 'linha' : 'linhas'} de dados.</TableCaption>
      )}
      {data.length === 0 && !isLoading && (
         <TableCaption className="mt-4">Nenhum dado para mostrar na tabela.</TableCaption>
      )}
    </div>
  );
}
