import { z } from 'zod';

export const shariaQuerySchema = z.object({
  query: z.string().min(1, "Veuillez fournir un nom de société ou un ticker (ex: DHO, Delta Holding...)").max(50, "Le nom est trop long."),
});

export const companySearchSchema = z.object({
  query: z.string().min(2, "La recherche doit contenir au moins 2 caractères").max(50, "Recherche trop longue"),
});

// Ajouter d'autres schémas ici au fur et à mesure (ex: portfolioSchema, authSchema, etc.)
