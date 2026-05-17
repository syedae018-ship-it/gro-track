-- ============================================================
-- Backward Compatibility Data Migration for Payouts
-- ============================================================

-- Safely backfill completed_at for existing completed tasks
UPDATE public.tasks
SET completed_at = created_at
WHERE (status = 'completed' OR status = 'approved') 
  AND completed_at IS NULL;

-- Safely backfill payout_status for existing completed tasks
UPDATE public.tasks
SET payout_status = 'unpaid'
WHERE (status = 'completed' OR status = 'approved') 
  AND payout_status IS NULL;

-- Backfill payout_status for any tasks that somehow already got a payout_id linked
UPDATE public.tasks
SET payout_status = 'payout_requested'
WHERE payout_id IS NOT NULL 
  AND payout_status = 'unpaid';
