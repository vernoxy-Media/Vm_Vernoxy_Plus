-- migrate:up
-- =============================================================================
-- Migration: Employee Onboarding Activation & Document Rules
-- Description: Adds 'Onboarding' to employee_status enum, and adds
--              is_required_for_activation column to employee_documents.
-- =============================================================================

ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'Onboarding';

ALTER TABLE employee_documents 
ADD COLUMN IF NOT EXISTS is_required_for_activation BOOLEAN DEFAULT FALSE;

-- Update predefined required documents to is_required_for_activation = true
UPDATE employee_documents
SET is_required_for_activation = TRUE
WHERE document_type IN (
    'marksheet_10th',
    'marksheet_12th',
    'marksheet_ug',
    'pan_card',
    'aadhaar_card',
    'passport_photos',
    'bank_details',
    'nda_signed'
);

-- migrate:down
ALTER TABLE employee_documents DROP COLUMN IF EXISTS is_required_for_activation;
