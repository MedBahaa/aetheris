const SUPABASE_URL = 'https://hhuykbfollkldmatrcwx.supabase.co';
const ANON_KEY = 'sb_publishable_cRs4n-Kn4-I-yjTWaX1eAA_uYQAn7oy';

const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY
  },
  body: JSON.stringify({ email: 'mohamed@aetheris.ai', password: 'Password123' })
});
const data = await res.json();
console.log('Status:', res.status);
console.log(JSON.stringify(data, null, 2));
