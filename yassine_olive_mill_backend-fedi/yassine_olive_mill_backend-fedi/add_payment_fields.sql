-- Add payment fields to batches table
ALTER TABLE batches ADD COLUMN unit_price DECIMAL(10,2);
ALTER TABLE batches ADD COLUMN total_amount DECIMAL(10,2);
ALTER TABLE batches ADD COLUMN is_paid BOOLEAN DEFAULT 0;
ALTER TABLE batches ADD COLUMN payment_method TEXT DEFAULT 'cash';
ALTER TABLE batches ADD COLUMN payment_reference TEXT;
ALTER TABLE batches ADD COLUMN date_paid DATETIME;
