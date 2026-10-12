import React from 'react';
import { AppLayout, AppLayoutProps } from './AppLayout';

export interface AdminLayoutProps extends Omit<AppLayoutProps, 'requireAdmin'> {}

/**
 * AdminLayout delegates to the unified AppLayout shell with requireAdmin={true}.
 * Maintained for backward compatibility and explicit admin-route semantics.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = (props) => {
  return <AppLayout {...props} requireAdmin={true} />;
};
