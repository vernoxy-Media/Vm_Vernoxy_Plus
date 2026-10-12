-- migrate:up

ALTER TABLE otp_codes
    ADD CONSTRAINT ck_otp_codes_attempts_within_max
    CHECK (attempts <= max_attempts);

-- migrate:down

ALTER TABLE otp_codes
    DROP CONSTRAINT IF EXISTS ck_otp_codes_attempts_within_max;
