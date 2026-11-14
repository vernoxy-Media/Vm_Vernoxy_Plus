import React from 'react';
import { Code, Server, Cloud, Database } from 'lucide-react';
import { SettingsLookupSection } from './SettingsLookupSection';

/** The Tech Stack lists a project picks from (Project > Details > Tech Stack). */
export const SettingsTechFrontendSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="tech_frontend"
    title="Front-End Technologies"
    description="Front-end technologies a project can use (e.g. React, Next.js, Tailwind CSS). Chosen in a project's Tech Stack."
    addLabel="Add Front-End Technology"
    searchPlaceholder="Search front-end technologies..."
    icon={Code}
  />
);

export const SettingsTechBackendSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="tech_backend"
    title="Back-End Technologies"
    description="Back-end technologies a project can use (e.g. Node.js, Laravel, Django). Chosen in a project's Tech Stack."
    addLabel="Add Back-End Technology"
    searchPlaceholder="Search back-end technologies..."
    icon={Server}
  />
);

export const SettingsTechCloudSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="tech_cloud"
    title="Cloud Platforms"
    description="Cloud platforms and hosting a project can use (e.g. AWS, Vercel, Render). Chosen in a project's Tech Stack."
    addLabel="Add Cloud Platform"
    searchPlaceholder="Search cloud platforms..."
    icon={Cloud}
  />
);

export const SettingsTechDatabaseSection: React.FC = () => (
  <SettingsLookupSection
    lookupType="tech_database"
    title="Databases"
    description="Databases a project can use (e.g. PostgreSQL, MySQL, MongoDB). Chosen in a project's Tech Stack."
    addLabel="Add Database"
    searchPlaceholder="Search databases..."
    icon={Database}
  />
);
