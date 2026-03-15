import { supabase } from '../lib/supabase'

/**
 * Types d'activité possibles
 */
export const ACTIVITY_TYPES = {
  ENTERPRISE_CREATED: 'enterprise_created',
  ENTERPRISE_UPDATED: 'enterprise_updated',
  ENTERPRISE_DELETED: 'enterprise_deleted',
  ENTERPRISE_CONVERTED: 'enterprise_converted',
  ACTION_CREATED: 'action_created',
  ACTION_UPDATED: 'action_updated',
  ACTION_DELETED: 'action_deleted',
  SECTOR_CREATED: 'sector_created',
  SECTOR_DELETED: 'sector_deleted',
  USER_CREATED: 'user_created',
  USER_DEACTIVATED: 'user_deactivated',
  USER_REACTIVATED: 'user_reactivated',
  IMPORT_COMPLETED: 'import_completed',
  BACKUP_CREATED: 'backup_created',
  RESTORE_COMPLETED: 'restore_completed',
}

export const ACTIVITY_LABELS = {
  enterprise_created: 'Entreprise créée',
  enterprise_updated: 'Entreprise modifiée',
  enterprise_deleted: 'Entreprise supprimée',
  enterprise_converted: 'Prospect converti en client',
  action_created: 'Action commerciale ajoutée',
  action_updated: 'Action commerciale modifiée',
  action_deleted: 'Action supprimée',
  sector_created: 'Secteur créé',
  sector_deleted: 'Secteur supprimé',
  user_created: 'Compte utilisateur créé',
  user_deactivated: 'Compte désactivé',
  user_reactivated: 'Compte réactivé',
  import_completed: 'Import Excel terminé',
  backup_created: 'Backup créé',
  restore_completed: 'Restauration effectuée',
}

/**
 * Enregistre une activité dans le journal
 */
export async function logActivity({ type, userId, targetType, targetId, targetName, details }) {
  try {
    await supabase.from('activity_log').insert({
      activity_type: type,
      performed_by: userId,
      target_type: targetType || null,
      target_id: targetId || null,
      target_name: targetName || null,
      details: details || null,
    })
  } catch (err) {
    console.error('Erreur logActivity:', err)
  }
}
