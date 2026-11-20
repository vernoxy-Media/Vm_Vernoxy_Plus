-- migrate:up
-- A project now also records its Database. Front-End, Back-End, Cloud and Database are picked from lists
-- the Admin keeps in Settings (master_lookup). The project columns hold the chosen names, one per line.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_database TEXT;

INSERT INTO master_lookup (lookup_type, code, label, sort_order)
SELECT v.t, v.c, v.l, v.s
FROM (VALUES
    ('tech_frontend', 'react', 'React', 10),
    ('tech_frontend', 'nextjs', 'Next.js', 20),
    ('tech_frontend', 'vue', 'Vue.js', 30),
    ('tech_frontend', 'angular', 'Angular', 40),
    ('tech_frontend', 'html_css_js', 'HTML / CSS / JavaScript', 50),
    ('tech_frontend', 'tailwind_css', 'Tailwind CSS', 60),
    ('tech_frontend', 'typescript', 'TypeScript', 70),
    ('tech_frontend', 'flutter', 'Flutter', 80),
    ('tech_frontend', 'react_native', 'React Native', 90),
    ('tech_backend', 'nodejs', 'Node.js', 10),
    ('tech_backend', 'nestjs', 'NestJS', 20),
    ('tech_backend', 'express', 'Express.js', 30),
    ('tech_backend', 'laravel', 'Laravel', 40),
    ('tech_backend', 'php', 'PHP', 50),
    ('tech_backend', 'django', 'Django', 60),
    ('tech_backend', 'python', 'Python', 70),
    ('tech_backend', 'dotnet', '.NET', 80),
    ('tech_backend', 'java_spring', 'Java Spring Boot', 90),
    ('tech_cloud', 'vercel', 'Vercel', 10),
    ('tech_cloud', 'aws', 'AWS', 20),
    ('tech_cloud', 'azure', 'Microsoft Azure', 30),
    ('tech_cloud', 'gcp', 'Google Cloud', 40),
    ('tech_cloud', 'render', 'Render', 50),
    ('tech_cloud', 'digitalocean', 'DigitalOcean', 60),
    ('tech_cloud', 'cloudinary', 'Cloudinary', 70),
    ('tech_cloud', 'hostinger', 'Hostinger', 80),
    ('tech_database', 'postgresql', 'PostgreSQL', 10),
    ('tech_database', 'mysql', 'MySQL', 20),
    ('tech_database', 'mongodb', 'MongoDB', 30),
    ('tech_database', 'sqlite', 'SQLite', 40),
    ('tech_database', 'redis', 'Redis', 50),
    ('tech_database', 'firebase', 'Firebase', 60),
    ('tech_database', 'supabase', 'Supabase', 70),
    ('tech_database', 'mssql', 'Microsoft SQL Server', 80)
) AS v(t, c, l, s)
WHERE NOT EXISTS (
    SELECT 1 FROM master_lookup m WHERE m.lookup_type = v.t AND m.code = v.c AND m.deleted_at IS NULL
);

-- migrate:down
DELETE FROM master_lookup WHERE lookup_type IN ('tech_frontend', 'tech_backend', 'tech_cloud', 'tech_database') AND created_by IS NULL AND updated_at IS NULL;
ALTER TABLE projects DROP COLUMN IF EXISTS tech_database;
