-- Remove foreign key constraint from ticket_payments table
-- This allows deleting batches even if they have associated ticket_payments

-- Drop the constraint (try different possible names)
ALTER TABLE ticket_payments DROP CONSTRAINT IF EXISTS ticket_payments_ticketId_fkey;
ALTER TABLE ticket_payments DROP CONSTRAINT IF EXISTS ticket_payments_ticketId_batches_fk;
ALTER TABLE ticket_payments DROP CONSTRAINT IF EXISTS ticket_payments_ibfk_1;

-- If the above doesn't work, find and drop the constraint manually:
-- First, find the constraint name:
-- SELECT constraint_name 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'ticket_payments' 
-- AND constraint_type = 'FOREIGN KEY'
-- AND constraint_name LIKE '%ticketId%';

-- Then drop it using the actual name found:
-- ALTER TABLE ticket_payments DROP CONSTRAINT <constraint_name>;

