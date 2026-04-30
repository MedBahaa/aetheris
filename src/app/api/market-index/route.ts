import { NextResponse } from 'next/server';
import { IndexScraper } from '@/lib/scrapers/index-scraper';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';

export function OPTIONS() { return handleOptionsRequest(); }

export async function GET() {
  try {
    const data = await IndexScraper.getMASI();
    
    if (!data) {
      return corsHeaders(NextResponse.json(
        { status: 'error', message: 'Indice non disponible' },
        { status: 404 }
      ));
    }

    return corsHeaders(NextResponse.json({
      status: 'success',
      data
    }));

  } catch (error: any) {
    return corsHeaders(NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    ));
  }
}
