const AUTH_PATHS = new Set(['/api/admin/setup', '/api/admin/login', '/api/admin/logout']);
const sessionCookie = (req, token, maxAge) =>
  `autoloot_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.socket.encrypted ? '; Secure' : ''}`;

// Session management deliberately does not require the dashboard capability:
// initial setup/login issue the cookie needed to obtain that capability.
export async function adminRoutes({req, res, path, auth, clients, localHost, json, body}) {
  const status = path === '/api/admin/status';
  if (!status && !(req.method === 'POST' && AUTH_PATHS.has(path))) return false;
  if (!localHost(req)) {
    json(res, {error: 'Local administrator access required.'}, 403);
    return true;
  }
  if (status) {
    json(res, {configured: auth.configured, authenticated: auth.valid(req), legacyPasswordOnly: auth.legacyPasswordOnly});
    return true;
  }
  if (path === '/api/admin/logout') {
    if (!auth.valid(req)) {
      json(res, {error: 'Admin sign-in required.'}, 401);
      return true;
    }
    auth.logout(req);
    res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
    for (const client of clients) {
      if (client.role === 'admin' && !auth.valid(client.request)) client.res.end();
    }
  } else {
    const input = await body(req);
    const token = await auth.login(input.password, path === '/api/admin/setup', input.username);
    res.setHeader('Set-Cookie', sessionCookie(req, token, 43200));
  }
  json(res, {ok: true});
  return true;
}
