const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = '6ddbb29c-2455-4cff-a338-9628e4011e1d';

// Force email confirmation + reset password
const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({
    email_confirm: true,
    password: 'Password123'
  })
});

const data = await res.json();
console.log('Status:', res.status);
console.log('email_confirmed_at:', data.email_confirmed_at);
console.log('email:', data.email);
if (!res.ok) console.log('Error:', JSON.stringify(data, null, 2));
else console.log('✅ Email confirmé et mot de passe mis à jour');
