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
import { Download, Loader2, FileWarning } from 'lucide-react';
import { exportToCsv } from '@/lib/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataTableProps {
  data: Record<string, any>[];
  isLoading: boolean;
}

export function DataTable({ data, isLoading }: DataTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Loading data...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
        <FileWarning className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Data Available</p>
        <p className="text-sm">The webhook did not return any data to display in the table.</p>
      </div>
    );
  }

  const headers = Object.keys(data[0] || {});

  const handleDownload = () => {
    exportToCsv('webhook_data.csv', data);
  };
  
  const renderCellContent = (content: any) => {
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content);
    }
    if (typeof content === 'boolean') {
      return content ? 'true' : 'false';
    }
    if (content === null || content === undefined) {
      return '';
    }
    return String(content);
  };


  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export as CSV
        </Button>
      </div>
      <Card className="overflow-hidden shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/20 transition-colors">
                    {headers.map((header) => (
                      <TableCell key={`${rowIndex}-${header}`} className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
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
        <TableCaption className="mt-4">Showing {data.length} rows of data.</TableCaption>
      )}
    </div>
  );
}
