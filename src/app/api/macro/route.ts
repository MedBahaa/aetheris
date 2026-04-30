import { NextResponse } from 'next/server';
import { MacroScraper } from '@/lib/scrapers/macro-scraper';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';

export function OPTIONS() { return handleOptionsRequest(); }

export async function GET() {
  try {
    const data = await MacroScraper.getMacroData();
    if (!data) {
      return corsHeaders(NextResponse.json({ error: 'Data unavailable' }, { status: 503 }));
    }
    return corsHeaders(NextResponse.json(data));
  } catch (error) {
    return corsHeaders(NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }));
  }
}
