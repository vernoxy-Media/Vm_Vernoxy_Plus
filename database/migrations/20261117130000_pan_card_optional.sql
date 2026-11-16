-- migrate:up
-- Not every employee has a PAN card, so it no longer blocks activation. It can still be uploaded when they have one.
UPDATE employee_documents SET is_required_for_activation = false WHERE document_type = 'pan_card';

-- migrate:down
UPDATE employee_documents SET is_required_for_activation = true WHERE document_type = 'pan_card';
