-- migrate:up

CREATE TYPE otp_purpose AS ENUM (
    'login_2fa',
    'password_reset'
);

CREATE TYPE session_revoke_reason AS ENUM (
    'logout',
    'logout_all',
    'password_changed',
    'password_reset',
    'token_reuse_detected',
    'deactivated',
    'admin_revoked'
);

CREATE TYPE auth_event_type AS ENUM (
    'credentials_created',
    'credentials_reset_by_admin',
    'login_password_failed',
    'login_otp_sent',
    'login_otp_failed',
    'login_succeeded',
    'login_locked',
    'token_refreshed',
    'token_reuse_detected',
    'logout',
    'logout_all',
    'password_changed',
    'password_reset_requested',
    'password_reset_completed',
    'otp_resend_blocked'
);

-- migrate:down
DROP TYPE IF EXISTS auth_event_type;
DROP TYPE IF EXISTS session_revoke_reason;
DROP TYPE IF EXISTS otp_purpose;
