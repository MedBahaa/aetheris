import { NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { corsHeaders, handleOptionsRequest } from '@/lib/api-headers';
import { createServerSupabase, supabaseAdmin } from '@/lib/supabase-server';
import { checkRateLimitAsync } from '@/lib/rate-limiter';
import { shariaQuerySchema } from '@/lib/validations';
import { InputSanitizer } from '@/lib/input-sanitizer';

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo maximum

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

    const limit = await checkRateLimitAsync(`sharia:${user.id}`, 6, 60 * 60 * 1000);
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
        // 🔒 SÉCURITÉ : Limite de taille stricte (anti-OOM / DoS)
        if (file.size > MAX_PDF_SIZE_BYTES) {
          return corsHeaders(NextResponse.json(
            { status: 'error', message: 'Le fichier PDF dépasse la taille maximale autorisée (10 Mo).' },
            { status: 413 }
          ));
        }

        if (file.type && file.type !== 'application/pdf') {
          return corsHeaders(NextResponse.json(
            { status: 'error', message: 'Format de fichier non autorisé. Seuls les fichiers PDF sont acceptés.' },
            { status: 400 }
          ));
        }

        const buffer = await file.arrayBuffer();
        const bytes = Buffer.from(buffer);

        // 🔒 SÉCURITÉ : Vérification de la signature binaire (Magic Bytes %PDF-)
        if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
          return corsHeaders(NextResponse.json(
            { status: 'error', message: 'Le fichier fourni n\'est pas un document PDF valide.' },
            { status: 400 }
          ));
        }

        const base64Data = bytes.toString('base64');
        pdfData = {
          data: base64Data,
          mimeType: 'application/pdf'
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

          const dbClient = supabaseAdmin || supabase;
          const safeFilterQuery = InputSanitizer.sanitizePostgrestFilter(cleanQuery);

          if (!pdfData && safeFilterQuery) {
            // Check cache (7 days)
            const { data: companyMatch } = await dbClient
              .from('companies')
              .select('id, symbol')
              .or(`symbol.ilike.${safeFilterQuery},name.ilike.%${safeFilterQuery}%`)
              .limit(1)
              .maybeSingle();
              
            if (companyMatch) {
              cachedCompanyId = companyMatch.id;
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              
              const { data: cacheData } = await dbClient
                .from('analyses_cache')
                .select('result')
                .eq('company_id', companyMatch.id)
                .eq('agent_type', 'SHARIA')
                .gte('timestamp', sevenDaysAgo.toISOString())
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle();
                
              if (cacheData && cacheData.result) {
                result = cacheData.result;
              }
            }
          }

          if (!result) {
            result = await GeminiService.analyzeShariaCompliance(cleanQuery, pdfData);
            
            if (!pdfData) {
               if (!cachedCompanyId && result.ticker) {
                  const safeTicker = InputSanitizer.sanitizeForDb(result.ticker);
                  if (safeTicker) {
                    const { data: companyByTicker } = await dbClient
                      .from('companies')
                      .select('id')
                      .ilike('symbol', safeTicker)
                      .limit(1)
                      .maybeSingle();
                    if (companyByTicker) cachedCompanyId = companyByTicker.id;
                  }
               }

               const hasInjectionArtifact = InputSanitizer.detectInjection(
                 `${result.summary || ''} ${result.explanation || ''}`
               );
               const isCacheableConfidence =
                 typeof result.confidenceScore === 'number' && result.confidenceScore >= 50;

               if (cachedCompanyId && isCacheableConfidence && !hasInjectionArtifact) {
                  await dbClient.from('analyses_cache').insert({
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
            message: 'Erreur lors de la recherche des états financiers et du calcul de conformité Sharia.'
          });
          controller.close();
        }
      }
    });

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });

    if (process.env.NEXT_PUBLIC_APP_URL) {
      headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL);
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      headers.set('Vary', 'Origin');
    }

    return new Response(stream, { headers });
  } catch (error: any) {
    console.error('[API sharia-screener Outer Error]:', error);
    return corsHeaders(
      NextResponse.json(
        {
          status: 'error',
          message: 'Erreur interne du serveur.'
        },
        { status: 500 }
      )
    );
  }
}
