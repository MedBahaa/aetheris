import { NextResponse } from 'next/server';
import { DividendScraper } from '@/lib/scrapers/dividend-scraper';

// Revalidate cache every 1 hour (3600 seconds)
export const revalidate = 3600;

export async function GET() {
  try {
    const data = await DividendScraper.getDividendYields();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching dividends:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
