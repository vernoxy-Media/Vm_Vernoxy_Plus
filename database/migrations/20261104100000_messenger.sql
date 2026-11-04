-- migrate:up
-- Messenger: one-to-one chats and groups, messages, reactions, stars, pins and per-user state.

CREATE TABLE IF NOT EXISTS msg_conversation (
    conversation_id  bigserial PRIMARY KEY,
    kind             varchar(10)  NOT NULL CHECK (kind IN ('direct', 'group')),
    direct_key       varchar(40)  NULL,
    name             varchar(60)  NULL,
    description      varchar(500) NULL,
    only_admins_post boolean      NOT NULL DEFAULT false,
    is_closed        boolean      NOT NULL DEFAULT false,
    created_by       integer      NULL REFERENCES employees (emp_id),
    created_at       timestamptz  NOT NULL DEFAULT clock_timestamp(),
    last_message_at  timestamptz  NOT NULL DEFAULT clock_timestamp()
);
-- Exactly one private conversation per pair of employees.
CREATE UNIQUE INDEX IF NOT EXISTS uq_msg_conversation_direct_key ON msg_conversation (direct_key) WHERE direct_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS msg_member (
    conversation_id           bigint      NOT NULL REFERENCES msg_conversation (conversation_id) ON DELETE CASCADE,
    emp_id                    integer     NOT NULL REFERENCES employees (emp_id),
    is_admin                  boolean     NOT NULL DEFAULT false,
    joined_at                 timestamptz NOT NULL DEFAULT clock_timestamp(),
    left_at                   timestamptz NULL,
    last_read_message_id      bigint      NOT NULL DEFAULT 0,
    last_delivered_message_id bigint      NOT NULL DEFAULT 0,
    muted_until               timestamptz NULL,
    is_archived               boolean     NOT NULL DEFAULT false,
    pinned_at                 timestamptz NULL,
    marked_unread             boolean     NOT NULL DEFAULT false,
    PRIMARY KEY (conversation_id, emp_id)
);
CREATE INDEX IF NOT EXISTS ix_msg_member_emp ON msg_member (emp_id) WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS msg_message (
    message_id      bigserial PRIMARY KEY,
    conversation_id bigint      NOT NULL REFERENCES msg_conversation (conversation_id) ON DELETE CASCADE,
    sender_id       integer     NULL REFERENCES employees (emp_id),
    kind            varchar(10) NOT NULL CHECK (kind IN ('text', 'file', 'system')),
    body            text        NULL,
    reply_to_id     bigint      NULL REFERENCES msg_message (message_id),
    is_forwarded    boolean     NOT NULL DEFAULT false,
    file_name       varchar(255) NULL,
    file_path       varchar(500) NULL,
    file_size       bigint      NULL,
    mime_type       varchar(150) NULL,
    edited_at       timestamptz NULL,
    deleted_at      timestamptz NULL,
    deleted_by      integer     NULL REFERENCES employees (emp_id),
    deleted_mode    varchar(10) NULL CHECK (deleted_mode IS NULL OR deleted_mode IN ('everyone', 'admin')),
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS ix_msg_message_conv ON msg_message (conversation_id, message_id DESC);

-- Original text of every edited or deleted message (not visible to participants).
CREATE TABLE IF NOT EXISTS msg_message_audit (
    audit_id    bigserial PRIMARY KEY,
    message_id  bigint      NOT NULL REFERENCES msg_message (message_id) ON DELETE CASCADE,
    action      varchar(10) NOT NULL CHECK (action IN ('edit', 'delete')),
    old_body    text        NULL,
    actor_id    integer     NULL REFERENCES employees (emp_id),
    created_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- "Delete for me"
CREATE TABLE IF NOT EXISTS msg_hidden (
    message_id bigint  NOT NULL REFERENCES msg_message (message_id) ON DELETE CASCADE,
    emp_id     integer NOT NULL REFERENCES employees (emp_id),
    PRIMARY KEY (message_id, emp_id)
);

CREATE TABLE IF NOT EXISTS msg_reaction (
    message_id bigint      NOT NULL REFERENCES msg_message (message_id) ON DELETE CASCADE,
    emp_id     integer     NOT NULL REFERENCES employees (emp_id),
    emoji      varchar(16) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (message_id, emp_id, emoji)
);

CREATE TABLE IF NOT EXISTS msg_star (
    emp_id     integer     NOT NULL REFERENCES employees (emp_id),
    message_id bigint      NOT NULL REFERENCES msg_message (message_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (emp_id, message_id)
);

CREATE TABLE IF NOT EXISTS msg_pin (
    conversation_id bigint      NOT NULL REFERENCES msg_conversation (conversation_id) ON DELETE CASCADE,
    message_id      bigint      NOT NULL REFERENCES msg_message (message_id) ON DELETE CASCADE,
    pinned_by       integer     NOT NULL REFERENCES employees (emp_id),
    pinned_at       timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (conversation_id, message_id)
);

-- Presence: last seen and the status the user set by hand.
CREATE TABLE IF NOT EXISTS msg_user_state (
    emp_id       integer      PRIMARY KEY REFERENCES employees (emp_id),
    status       varchar(10)  NOT NULL DEFAULT 'auto' CHECK (status IN ('auto', 'available', 'busy', 'dnd')),
    status_text  varchar(100) NULL,
    status_until timestamptz  NULL,
    last_seen_at timestamptz  NULL
);

-- migrate:down
DROP TABLE IF EXISTS msg_user_state;
DROP TABLE IF EXISTS msg_pin;
DROP TABLE IF EXISTS msg_star;
DROP TABLE IF EXISTS msg_reaction;
DROP TABLE IF EXISTS msg_hidden;
DROP TABLE IF EXISTS msg_message_audit;
DROP TABLE IF EXISTS msg_message;
DROP TABLE IF EXISTS msg_member;
DROP TABLE IF EXISTS msg_conversation;
