import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminOperation {
  id?: string;
  operation_type: string;
  operation_data: Record<string, any>;
  target_table: string;
  target_ids: string[];
  priority?: number;
  scheduled_for?: Date;
}

export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  total_count: number;
  errors: string[];
  operation_id: string;
}

export class AdminOperationsService {
  /**
   * Queue a new admin operation for background processing
   */
  static async queueOperation(operation: AdminOperation): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('admin_operations_queue')
        .insert({
          operation_type: operation.operation_type,
          operation_data: operation.operation_data,
          target_table: operation.target_table,
          target_ids: operation.target_ids,
          priority: operation.priority || 5,
          scheduled_for: operation.scheduled_for?.toISOString() || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error queueing operation:', error);
      throw new Error('Failed to queue operation');
    }
  }

  /**
   * Execute bulk status changes with progress tracking
   */
  static async executeBulkStatusChange(
    userIds: string[],
    newStatus: 'active' | 'blocked' | 'unverified' | 'pending_verification',
    notes?: string
  ): Promise<BulkOperationResult> {
    const operationId = await this.queueOperation({
      operation_type: 'bulk_status_change',
      operation_data: {
        new_status: newStatus,
        notes: notes,
        timestamp: new Date().toISOString()
      },
      target_table: 'profiles',
      target_ids: userIds,
      priority: 3
    });

    // Execute immediately for small batches, queue for large ones
    if (userIds.length <= 10) {
      return await this.executeBulkStatusChangeImmediate(userIds, newStatus, notes, operationId);
    } else {
      toast.success(`Queued bulk operation for ${userIds.length} users. You'll be notified when complete.`);
      return {
        success_count: 0,
        failure_count: 0,
        total_count: userIds.length,
        errors: [],
        operation_id: operationId
      };
    }
  }

  /**
   * Execute bulk status change immediately
   */
  private static async executeBulkStatusChangeImmediate(
    userIds: string[],
    newStatus: 'active' | 'blocked' | 'unverified' | 'pending_verification',
    notes: string | undefined,
    operationId: string
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      success_count: 0,
      failure_count: 0,
      total_count: userIds.length,
      errors: [],
      operation_id: operationId
    };

    // Update operation status
    await supabase
      .from('admin_operations_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', operationId);

    for (const userId of userIds) {
      try {
        // Get current user data for audit
        const { data: currentUser, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;

        // Update user status
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) throw updateError;

        // Log the audit entry
        await supabase
          .from('user_audit_log')
          .insert({
            user_id: userId,
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: 'bulk_status_change',
            entity_type: 'profile',
            entity_id: userId,
            old_values: { status: currentUser.status },
            new_values: { status: newStatus },
            change_summary: `Bulk status change: ${currentUser.status} → ${newStatus}`,
            metadata: { operation_id: operationId, notes }
          });

        results.success_count++;
      } catch (error) {
        results.failure_count++;
        results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error updating user ${userId}:`, error);
      }
    }

    // Update operation completion status
    await supabase
      .from('admin_operations_queue')
      .update({
        status: results.failure_count === 0 ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
        error_message: results.errors.length > 0 ? results.errors.join('; ') : null
      })
      .eq('id', operationId);

    return results;
  }

  /**
   * Get dashboard stats using optimized function
   */
  static async getDashboardStats() {
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get paginated users with filters
   */
  static async getPaginatedUsers(options: {
    page: number;
    pageSize: number;
    searchQuery?: string;
    statusFilter?: string;
    typeFilter?: string;
    roleFilter?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const { page, pageSize, searchQuery, statusFilter, typeFilter, roleFilter, sortBy = 'created_at', sortOrder = 'desc' } = options;
      const start = (page - 1) * pageSize;

      let query = supabase
        .from('profiles')
        .select(`
          id, full_name, email, phone, status, user_role, account_type, 
          created_at, updated_at, last_login, login_count, import_batch_id,
          profile_completion_percentage, profile_picture_url
        `, { count: 'exact' });

      // Apply filters
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'active' | 'blocked' | 'unverified' | 'pending_verification');
      }

      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('account_type', typeFilter);
      }

      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('user_role', roleFilter);
      }

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(start, start + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    } catch (error) {
      console.error('Error fetching paginated users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get user audit history
   */
  static async getUserAuditHistory(userId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('user_audit_log')
        .select(`
          *,
          admin:admin_id(full_name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user audit history:', error);
      throw new Error('Failed to fetch audit history');
    }
  }

  /**
   * Monitor operation progress
   */
  static async getOperationStatus(operationId: string) {
    try {
      const { data, error } = await supabase
        .from('admin_operations_queue')
        .select('*')
        .eq('id', operationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching operation status:', error);
      throw new Error('Failed to fetch operation status');
    }
  }

  /**
   * Get active operations for current admin
   */
  static async getActiveOperations() {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('admin_operations_queue')
        .select('*')
        .eq('created_by', user.user.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching active operations:', error);
      throw new Error('Failed to fetch active operations');
    }
  }
}