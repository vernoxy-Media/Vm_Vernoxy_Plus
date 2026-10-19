-- migrate:up

CREATE TABLE notifications (
    notification_id integer GENERATED ALWAYS AS IDENTITY,
    recipient_id integer NOT NULL,
    kind varchar(50) NOT NULL,
    title varchar(150) NOT NULL,
    body varchar(300) NULL,
    entity_type varchar(30) NULL,
    entity_id integer NULL,
    read_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by integer NULL,
    updated_at timestamptz NULL,
    updated_by integer NULL,
    deleted_at timestamptz NULL,
    deleted_by integer NULL,
    CONSTRAINT pk_notifications PRIMARY KEY (notification_id),
    CONSTRAINT fk_notifications_recipient_id FOREIGN KEY (recipient_id) REFERENCES employees(emp_id),
    CONSTRAINT fk_notifications_created_by FOREIGN KEY (created_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_notifications_updated_by FOREIGN KEY (updated_by) REFERENCES employees(emp_id),
    CONSTRAINT fk_notifications_deleted_by FOREIGN KEY (deleted_by) REFERENCES employees(emp_id),
    CONSTRAINT ck_notifications_kind_format CHECK (kind ~ '^[a-z_]+$'),
    CONSTRAINT ck_notifications_soft_delete CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

CREATE INDEX ix_notifications_recipient_unread
    ON notifications (recipient_id, created_at DESC)
    WHERE read_at IS NULL AND deleted_at IS NULL;

CREATE INDEX ix_notifications_recipient_all
    ON notifications (recipient_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_prevent_hard_delete_notifications
    BEFORE DELETE ON notifications
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

CREATE TRIGGER trg_prevent_truncate_notifications
    BEFORE TRUNCATE ON notifications
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prevent_truncate();

CREATE TRIGGER trg_handle_update_audit_notifications
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION fn_handle_update_audit();

-- migrate:down
DROP TRIGGER IF EXISTS trg_handle_update_audit_notifications ON notifications;
DROP TRIGGER IF EXISTS trg_prevent_truncate_notifications ON notifications;
DROP TRIGGER IF EXISTS trg_prevent_hard_delete_notifications ON notifications;
DROP TABLE IF EXISTS notifications;
