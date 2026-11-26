-- Apply after provisioning the users table and before enabling local signup.
CREATE UNIQUE INDEX IF NOT EXISTS users_active_email_uq
    ON users (lower(email)) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_active_nickname_uq
    ON users (nickname) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS user_profile_images (
    image_key varchar(36) PRIMARY KEY,
    media_type varchar(32) NOT NULL,
    contents bytea NOT NULL
);
