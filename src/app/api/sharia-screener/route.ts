import { NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { createServerSupabase } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { shariaQuerySchema } from '@/lib/validations';

export function OPTIONS() {
  return handleOptionsRequest();
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return corsHeaders(NextResponse.json(
        { status: 'error', message: 'Authentification requise.' },
        { status: 401 }
      ));
    }

    const limit = checkRateLimit(`sharia:${user.id}`, 6, 60 * 60 * 1000);
    if (!limit.allowed) {
      return corsHeaders(NextResponse.json(
        { status: 'error', message: 'Limite d’analyses atteinte. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      ));
    }

    const contentType = req.headers.get('content-type') || '';
    let body: any = {};
    let pdfData: { data: string, mimeType: string } | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData().catch(() => new FormData());
      body.query = formData.get('query')?.toString() || '';
      
      const file = formData.get('pdf');
      if (file && file instanceof File) {
        const buffer = await file.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        pdfData = {
          data: base64Data,
          mimeType: file.type || 'application/pdf'
        };
      }
    } else {
      body = await req.json().catch(() => ({}));
    }
    
    // Validation avec Zod
    const validationResult = shariaQuerySchema.safeParse(body);
    if (!validationResult.success) {
      return corsHeaders(
        NextResponse.json(
          { status: 'error', message: validationResult.error.issues[0].message },
          { status: 400 }
        )
      );
    }

    const { query } = validationResult.data;
    const cleanQuery = query.trim();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          if (pdfData) {
            sendEvent({ step: 1, message: "Extraction des données depuis le PDF fourni..." });
          } else {
            sendEvent({ step: 1, message: "Recherche des états financiers officiels sur le web..." });
          }
          
          const step2Timer = setTimeout(() => {
             sendEvent({ step: 2, message: "Analyse comptable et Extraction des montants bruts..." });
          }, 2500);

          const step3Timer = setTimeout(() => {
             sendEvent({ step: 3, message: "Calculs des Ratios AAOIFI et du Taux de Purification..." });
          }, 5000);

          let result = null;
          let cachedCompanyId = null;

          if (!pdfData) {
            // Check cache (7 days)
            const { data: companyMatch } = await supabase
              .from('companies')
              .select('id, symbol')
              .or(`symbol.ilike.${cleanQuery},name.ilike.%${cleanQuery}%`)
              .limit(1)
              .single();
              
            if (companyMatch) {
              cachedCompanyId = companyMatch.id;
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              
              const { data: cacheData } = await supabase
                .from('analyses_cache')
                .select('result')
                .eq('company_id', companyMatch.id)
                .eq('agent_type', 'SHARIA')
                .gte('timestamp', sevenDaysAgo.toISOString())
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();
                
              if (cacheData && cacheData.result) {
                result = cacheData.result;
              }
            }
          }

          if (!result) {
            result = await GeminiService.analyzeShariaCompliance(cleanQuery, pdfData);
            
            if (!pdfData) {
               if (!cachedCompanyId) {
                  const { data: companyByTicker } = await supabase
                    .from('companies')
                    .select('id')
                    .ilike('symbol', result.ticker)
                    .limit(1)
                    .single();
                  if (companyByTicker) cachedCompanyId = companyByTicker.id;
               }

               if (cachedCompanyId) {
                  await supabase.from('analyses_cache').insert({
                    company_id: cachedCompanyId,
                    agent_type: 'SHARIA',
                    result: result
                  });
               }
            }
          }
          
          clearTimeout(step2Timer);
          clearTimeout(step3Timer);

          sendEvent({ step: 4, status: 'success', data: result });
          controller.close();
        } catch (error: any) {
          console.error('[API sharia-screener Error]:', error);
          sendEvent({
            step: 4,
            status: 'error',
            message: error?.message || 'Erreur lors de la recherche des états financiers et du calcul de conformité Sharia'
          });
          controller.close();
        }
      }
    });

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });

    return new Response(stream, { headers });
  } catch (error: any) {
    console.error('[API sharia-screener Outer Error]:', error);
    return corsHeaders(
      NextResponse.json(
        {
          status: 'error',
          message: error?.message || 'Erreur interne du serveur'
        },
        { status: 500 }
      )
    );
  }
}
