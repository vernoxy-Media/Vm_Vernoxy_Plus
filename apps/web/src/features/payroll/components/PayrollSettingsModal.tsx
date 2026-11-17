import React from 'react';
import { Modal, btn } from './payroll-ui';
import { PayrollSettingsForm } from './PayrollSettingsForm';

/**
 * Payroll Settings, read-only, for Accounts users on the Payroll page. The Admin edits them in
 * Settings -> HR -> Payroll Settings.
 */
export const PayrollSettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Modal
    open={open}
    onClose={onClose}
    width="max-w-3xl"
    title="Payroll Settings"
    subtitle="View only. The Admin edits these settings in Settings → HR → Payroll Settings."
    footer={
      <button type="button" className={btn.secondary} onClick={onClose}>
        Close
      </button>
    }
  >
    <PayrollSettingsForm canEdit={false} active={open} />
  </Modal>
);
