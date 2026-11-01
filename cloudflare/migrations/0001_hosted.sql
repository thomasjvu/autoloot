CREATE TABLE IF NOT EXISTS workspace_records (
  workspace_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK(revision>=0),
  state_json TEXT NOT NULL CHECK(json_valid(state_json)),
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_accounts (
  workspace_id TEXT NOT NULL,
  twitch_user_id TEXT NOT NULL,
  login TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','buyer')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(workspace_id,twitch_user_id)
);
CREATE VIEW IF NOT EXISTS hosted_orders AS
SELECT w.workspace_id,w.revision,json_extract(o.value,'$.id') AS order_id,
  json_extract(o.value,'$.userId') AS buyer_id,json_extract(o.value,'$.status') AS status,
  json_extract(o.value,'$.total') AS total,json_extract(o.value,'$.createdAt') AS created_at
FROM workspace_records w,json_each(w.state_json,'$.orders') o;
CREATE VIEW IF NOT EXISTS hosted_inventory AS
SELECT w.workspace_id,w.revision,json_extract(p.value,'$.id') AS product_id,
  json_extract(p.value,'$.title') AS title,json_extract(p.value,'$.quantity') AS quantity
FROM workspace_records w,json_each(w.state_json,'$.products') p;
