import postgres from 'postgres';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL || '');

async function migrate() {
  console.log('--- Démarrage de la migration SQL ---');
  try {
    const schemaSql = fs.readFileSync('src/lib/db/schema.sql', 'utf8');
    
    // On exécute le schéma complet
    // Note: postgres-js gère les requêtes multiples si elles sont séparées par des points-virgules
    await sql.unsafe(schemaSql);
    
    console.log('Migration réussie !');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    await sql.end();
  }
}

migrate();
