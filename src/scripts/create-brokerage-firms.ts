import postgres from 'postgres';
import 'dotenv/config'; // Make sure dotenv loads .env.local

async function createTable() {
  const sql = postgres(process.env.DATABASE_URL as string);
  
  try {
    console.log('Creating brokerage_firms table...');
    await sql`
      CREATE TABLE IF NOT EXISTS brokerage_firms (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        agrement TEXT,
        date_agrement TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;
    console.log('✅ Table created successfully.');
  } catch (err: any) {
    console.error('❌ Error creating table:', err.message);
  } finally {
    await sql.end();
  }
}

createTable();
