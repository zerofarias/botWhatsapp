ALTER TABLE conversations
  ADD COLUMN progress_status ENUM('pending', 'in_preparation', 'completed', 'cancelled', 'inactive') NOT NULL DEFAULT 'pending';
