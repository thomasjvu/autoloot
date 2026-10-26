import { randomBytes, createHash } from "node:crypto";
export class Twitch {
  constructor(engine, changed = () => {}, sessions = new Map()) {
    this.engine = engine;
    this.changed = changed;
    this.client = process.env.TWITCH_CLIENT_ID;
    this.secret = process.env.TWITCH_CLIENT_SECRET;
    this.base = (process.env.PUBLIC_URL || "http://localhost:4173").replace(
      /\/$/,
      "",
    );
    this.pending = new Map();
    this.sessions = sessions;
    this.status = {
      configured: Boolean(this.client && this.secret),
      connected: false,
      channel: null,
      error: null,
    };
    this.seen = new Set();
    this.retry = 0;
    this.retryTimer = null;
  }
  login(role = "viewer", nonce) {
    if (!/^[a-f0-9]{64}$/.test(nonce || "")) throw Error("Start sign-in in this browser.");
    if (!this.status.configured)
      throw new Error(
        "Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env, then restart.",
      );
    for (const [key, value] of this.pending)
      if (Date.now() - value.at > 600000) this.pending.delete(key);
    if (this.pending.size >= 1000) throw Error('Sign-in capacity reached. Try again later.');
    const state = randomBytes(24).toString("hex");
    this.pending.set(state, { role, at: Date.now(), nonceHash:createHash("sha256").update(nonce).digest("hex") });
    return `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams({ client_id: this.client, redirect_uri: this.base + "/auth/twitch/callback", response_type: "code", scope: role === "streamer" ? "user:read:chat user:write:chat" : "", state, force_verify: "true" })}`;
  }
  async callback(code, state, nonce) {
    const pending = this.pending.get(state);
    if (!pending || Date.now() - pending.at > 600000)
      throw new Error("Login expired. Please start again.");
    if (!/^[a-f0-9]{64}$/.test(nonce || "") || createHash("sha256").update(nonce).digest("hex") !== pending.nonceHash)
      throw Error("Sign-in must finish in the browser where it started.");
    this.pending.delete(state);
    const r = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: this.client,
        client_secret: this.secret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.base + "/auth/twitch/callback",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const tokens = await r.json();
    if (!r.ok) throw new Error("Twitch could not complete login.");
    const valid = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `OAuth ${tokens.access_token}` },
      signal: AbortSignal.timeout(15000),
    });
    const user = await valid.json();
    if (!valid.ok || user.client_id !== this.client)
      throw new Error("Twitch identity validation failed.");
    const identity = { id: user.user_id, login: user.login, kind: "twitch" };
    if (pending.role === "streamer") {
      this.tokens = tokens;
      this.user = identity;
      this.status.channel = identity.login;
      this.status.error = null;
      await this.connect();
    } else this.engine.register(identity);
    const session = randomBytes(32).toString("hex");
    this.sessions.set(session, {
      ...identity,
      role: pending.role,
      expires: Date.now() + 86400000,
    });
    return { session, role: pending.role };
  }
  session(cookie) {
    const token = String(cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("autoloot_session="))
      ?.slice(17);
    const s = this.sessions.get(token);
    return s && s.expires > Date.now() ? s : null;
  }
  logout(cookie) {
    const token=String(cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('autoloot_session='))?.slice(17);
    if(token)this.sessions.delete(token);
  }
  async api(path, body) {
    if (!this.tokens) throw new Error("Connect Twitch first.");
    const run = () =>
      fetch("https://api.twitch.tv/helix/" + path, {
        method: body ? "POST" : "GET",
        headers: {
          "Client-Id": this.client,
          Authorization: `Bearer ${this.tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
    let r = await run();
    if (r.status === 401 && this.tokens.refresh_token) {
      const t = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.tokens.refresh_token,
          client_id: this.client,
          client_secret: this.secret,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!t.ok)
        throw new Error("Twitch login expired. Reconnect your account.");
      this.tokens = await t.json();
      r = await run();
    }
    if (!r.ok)
      throw new Error(
        `Twitch request failed (${r.status}). Check connection and scopes.`,
      );
    return r.status === 204 ? {} : r.json();
  }
  connect(url = "wss://eventsub.wss.twitch.tv/ws", migrating = false) {
    if (!/^wss:\/\/eventsub\.wss\.twitch\.tv\//.test(url))
      throw new Error("Unexpected Twitch reconnect URL.");
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    return new Promise((resolve, reject) => {
      const previous = this.ws,
        ws = new WebSocket(url);
      let ready = false;
      this.ws = ws;
      const timeout = setTimeout(() => {
        if (!ready) {
          ws.close();
          reject(new Error("Twitch connection timed out."));
        }
      }, 15000);
      timeout.unref();
      const touch = (seconds) => {
        clearTimeout(ws.watchdog);
        ws.watchdog = setTimeout(
          () => ws.close(),
          (seconds || 30) * 1000 + 5000,
        );
        ws.watchdog.unref();
      };
      ws.addEventListener("message", async (event) => {
        try {
          if (ws.abandoned) return;
          const packet = JSON.parse(event.data),
            type = packet.metadata.message_type;
          touch(ws.keepalive);
          if (type === "session_welcome") {
            ws.keepalive =
              packet.payload.session.keepalive_timeout_seconds || 30;
            touch(ws.keepalive);
            if (!migrating)
              await this.api("eventsub/subscriptions", {
                type: "channel.chat.message",
                version: "1",
                condition: {
                  broadcaster_user_id: this.user.id,
                  user_id: this.user.id,
                },
                transport: {
                  method: "websocket",
                  session_id: packet.payload.session.id,
                },
              });
            if (ws !== this.ws || ws.abandoned) return;
            ready = true;
            clearTimeout(timeout);
            this.status.connected = true;
            this.status.error = null;
            this.retry = 0;
            if (migrating) previous?.close();
            this.changed();
            resolve();
          }
          if (type === "session_reconnect")
            await this.connect(packet.payload.session.reconnect_url, true);
          if (type === "revocation") {
            this.engine.tick();
            this.status.connected = false;
            this.status.error = "Chat permission revoked. Reconnect Twitch.";
            if (
              this.engine.state.mode === "live" &&
              this.engine.state.auction?.status === "live"
            )
              this.engine.pause();
            this.changed();
          }
          if (type === "notification") {
            const id = packet.metadata.message_id;
            if (this.seen.has(id)) return;
            this.seen.add(id);
            if (this.seen.size > 10000)
              this.seen.delete(this.seen.values().next().value);
            await this.onChat(packet.payload.event);
          }
        } catch (e) {
          this.status.error = e.message;
          this.changed();
          if (!ready) {
            clearTimeout(timeout);
            ws.close();
            reject(e);
          }
        }
      });
      ws.addEventListener("error", () => {
        if (!ready) {
          clearTimeout(timeout);
          reject(new Error("Could not connect to Twitch EventSub."));
        }
      });
      ws.addEventListener("close", () => {
        ws.abandoned = true;
        clearTimeout(ws.watchdog);
        clearTimeout(timeout);
        if (!ready) reject(new Error("Twitch connection closed before it was ready."));
        if (ws !== this.ws) return;
        this.status.connected = false;
        this.engine.tick();
        this.changed();
        if (
          this.engine.state.mode === "live" &&
          this.engine.state.auction?.status === "live"
        ) {
          this.engine.pause();
          this.engine.activity(
            "Twitch disconnected. Auction paused to protect bidders.",
          );
          this.engine.commit();
        }
        if (this.tokens) {
          this.retry++;
          clearTimeout(this.retryTimer);
          this.retryTimer = setTimeout(
            () => {
              this.retryTimer = null;
              if (this.tokens) this.connect().catch(() => {});
            },
            Math.min(30000, 1000 * 2 ** Math.min(this.retry, 5)),
          );
          this.retryTimer.unref();
        }
      });
    });
  }
  async validate() {
    if (!this.tokens) return;
    const check = () =>
      fetch("https://id.twitch.tv/oauth2/validate", {
        headers: { Authorization: `OAuth ${this.tokens.access_token}` },
        signal: AbortSignal.timeout(15000),
      });
    try {
      let result = await check();
      if (result.status === 401) {
        await this.api("users");
        result = await check();
      }
      const identity = await result.json();
      if (
        !result.ok ||
        identity.user_id !== this.user.id ||
        identity.client_id !== this.client
      )
        throw new Error(
          "Twitch login is no longer valid. Reconnect your account.",
        );
    } catch (error) {
      this.engine.tick();
      if (
        this.engine.state.mode === "live" &&
        this.engine.state.auction?.status === "live"
      )
        this.engine.pause();
      this.disconnect();
      this.status.error =
        "Twitch session validation failed. Reconnect to continue.";
      this.changed();
    }
  }
  async onChat(e) {
    if (this.engine.halted) return;
    if (
      e.broadcaster_user_id !== this.user.id ||
      (e.source_broadcaster_user_id &&
        e.source_broadcaster_user_id !== this.user.id)
    )
      return;
    const text = e.message.text;
    this.engine.chat(e.chatter_user_name, text, "twitch");
    if (this.engine.state.mode !== "live") return;
    const vote = text.trim().match(/^!vote\s+([1-3])$/i);
    if (vote) {
      try {
        this.engine.vote({
          userId: e.chatter_user_id,
          option: Number(vote[1]),
          source: "twitch",
        });
      } catch (error) {
        await this.send(`@${e.chatter_user_login} ${error.message}`);
      }
      return;
    }
    const match = text.trim().match(/^!bid\s+\$?(\d{1,7}(?:\.\d{1,2})?)$/i);
    if (match) {
      try {
        this.engine.bid({
          userId: e.chatter_user_id,
          username: e.chatter_user_name,
          amount: match[1],
          source: "twitch",
          messageId: e.message_id,
        });
      } catch (err) {
        await this.send(`@${e.chatter_user_login} ${err.message}`);
      }
    } else if (/^!bid\b/i.test(text))
      await this.send(
        `@${e.chatter_user_login} Use !bid 25.00 to place a USD bid.`,
      );
    else if (/^!register$/i.test(text))
      await this.send(`Register to bid: ${this.base}/shop`);
    else if (/^!lot$/i.test(text)) {
      const a = this.engine.state.auction;
      await this.send(
        a
          ? `${a.product.title} — ${a.status}. ${a.highest ? "Highest bid " + (a.highest.amount / 100).toFixed(2) : "Starts at " + (a.product.price / 100).toFixed(2)} USD.`
          : "No current auction.",
      );
    }
  }
  async send(message) {
    if (!this.status.connected) return;
    const result = await this.api("chat/messages", {
      broadcaster_id: this.user.id,
      sender_id: this.user.id,
      message: message.slice(0, 490),
    });
    if (result.data?.[0]?.is_sent === false)
      throw new Error("Twitch did not send the announcement.");
  }
  disconnect() {
    this.tokens = null;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.ws) this.ws.abandoned = true;
    this.ws?.close();
    this.status.connected = false;
    this.status.channel = null;
    this.changed();
  }
  close() {
    this.disconnect();
  }
}
