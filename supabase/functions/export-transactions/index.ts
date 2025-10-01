import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  userId: string;
  format: 'pdf' | 'csv';
  startDate?: string;
  endDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, format, startDate, endDate }: ExportRequest = await req.json();

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    if (format === 'csv') {
      const csvContent = generateCSV(transactions);
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="transactions.csv"',
          ...corsHeaders
        }
      });
    } else {
      // For PDF, we'd need a PDF generation library
      // For now, return a simple text response
      const pdfContent = generatePDFText(transactions);
      return new Response(pdfContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="transactions.txt"',
          ...corsHeaders
        }
      });
    }

  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

function generateCSV(transactions: any[]): string {
  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Status', 'Fee', 'Reference'];
  const csvRows = [headers.join(',')];

  transactions.forEach(tx => {
    const row = [
      new Date(tx.created_at).toISOString(),
      tx.transaction_type,
      tx.amount,
      tx.currency,
      tx.status,
      tx.fee_amount || 0,
      tx.reference || ''
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

function generatePDFText(transactions: any[]): string {
  let content = 'TRANSACTION HISTORY REPORT\n';
  content += '================================\n\n';

  transactions.forEach(tx => {
    content += `Date: ${new Date(tx.created_at).toLocaleString()}\n`;
    content += `Type: ${tx.transaction_type}\n`;
    content += `Amount: ${tx.currency} ${tx.amount}\n`;
    content += `Status: ${tx.status}\n`;
    if (tx.fee_amount) {
      content += `Fee: ${tx.currency} ${tx.fee_amount}\n`;
    }
    if (tx.reference) {
      content += `Reference: ${tx.reference}\n`;
    }
    content += '--------------------------------\n';
  });

  return content;
}

serve(handler);