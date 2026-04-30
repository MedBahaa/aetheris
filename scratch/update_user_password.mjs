const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_EMAIL = 'Mohamed@aetheris.ai';

// Step 1: Find the user by email
const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  }
});
const listData = await listRes.json();
const user = listData.users?.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());

if (!user) {
  console.error('User not found:', TARGET_EMAIL);
  process.exit(1);
}

console.log('Found user:', user.id, user.email);

// Step 2: Update the password
const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ password: 'Password123' })
});

const updateData = await updateRes.json();
if (updateRes.ok) {
  console.log('✅ Password updated successfully for', updateData.email);
} else {
  console.error('❌ Failed to update password:', JSON.stringify(updateData, null, 2));
}
