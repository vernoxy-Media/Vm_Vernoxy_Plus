import React from 'react';
import { AppLayout, AppLayoutProps } from './AppLayout';

export interface AdminLayoutProps extends Omit<AppLayoutProps, 'requireAdmin'> {}

/**
 * AdminLayout delegates to the unified AppLayout shell with requireAdmin={true}.
 * Maintained for backward compatibility and explicit admin-route semantics.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ fluid = true, ...props }) => {
  return <AppLayout fluid={fluid} {...props} requireAdmin={true} />;
};

