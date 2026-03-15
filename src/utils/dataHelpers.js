import { supabase } from '../lib/supabase'

/**
 * Récupère TOUTES les lignes d'une table Supabase, sans limite.
 * Pagine automatiquement par lots de 1000 (limite Supabase par défaut).
 * 
 * @param {string} table - Nom de la table
 * @param {object} options - Options optionnelles
 * @param {string} options.select - Colonnes à sélectionner (défaut: '*')
 * @param {object} options.filters - Filtres à appliquer { column: value }
 * @param {object} options.order - Tri { column, ascending }
 * @param {string} options.eq - Filtre simple { column, value }
 * @returns {Promise<Array>} Toutes les lignes
 */
export async function fetchAll(table, options = {}) {
  const PAGE_SIZE = 1000
  const allData = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(options.select || '*')
      .range(from, from + PAGE_SIZE - 1)

    // Appliquer les filtres simples
    if (options.eq) {
      query = query.eq(options.eq.column, options.eq.value)
    }

    // Appliquer des filtres multiples
    if (options.filters) {
      for (const [column, value] of Object.entries(options.filters)) {
        query = query.eq(column, value)
      }
    }

    // Appliquer le tri
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true })
    }

    const { data, error } = await query

    if (error) {
      console.error(`fetchAll(${table}) error:`, error)
      break
    }

    if (data && data.length > 0) {
      allData.push(...data)
    }

    // Si on reçoit moins que PAGE_SIZE, on a tout récupéré
    if (!data || data.length < PAGE_SIZE) {
      hasMore = false
    } else {
      from += PAGE_SIZE
    }
  }

  return allData
}

/**
 * Insère des données en lots pour éviter les timeouts.
 * 
 * @param {string} table - Nom de la table
 * @param {Array} rows - Lignes à insérer
 * @param {number} batchSize - Taille des lots (défaut: 100)
 * @returns {Promise<{inserted: number, errors: number}>}
 */
export async function insertBatch(table, rows, batchSize = 100) {
  let inserted = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).upsert(batch)
    if (error) {
      console.error(`insertBatch(${table}) error at batch ${i}:`, error)
      errors += batch.length
    } else {
      inserted += batch.length
    }
  }

  return { inserted, errors }
}

/**
 * Supprime toutes les lignes d'une table (par lots).
 * Utilise un filtre "tout matcher" pour contourner la contrainte Supabase.
 * 
 * @param {string} table - Nom de la table
 */
export async function deleteAll(table) {
  // Supabase exige un filtre pour delete, on utilise id != impossible UUID
  const { error } = await supabase
    .from(table)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  
  if (error) {
    console.error(`deleteAll(${table}) error:`, error)
    throw error
  }
}
