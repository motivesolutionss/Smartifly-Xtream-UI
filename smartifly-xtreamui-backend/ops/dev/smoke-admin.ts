type Json = Record<string, unknown>;

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5000";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? "adnankhawar005@gmail.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? "Aadi@123$";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function main() {
  console.log(`Smoke base: ${BASE_URL}`);

  const health = await req("/v1/health");
  assert(health.res.ok, "Health endpoint failed");
  console.log("OK health");

  const login = await req("/v1/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert(login.res.ok, "Admin login failed");
  const loginBody = login.body as Json;
  const accessToken = String(loginBody.accessToken ?? "");
  assert(accessToken.length > 20, "Missing access token");
  console.log("OK auth/login");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const profile = await req("/v1/admin/auth/profile", { headers: authHeaders });
  assert(profile.res.ok, "Admin profile failed");
  console.log("OK auth/profile");

  const usersStats = await req("/v1/admin/users/stats", { headers: authHeaders });
  assert(usersStats.res.ok, "Users stats failed");
  console.log("OK users/stats");

  const usersList = await req("/v1/admin/users?page=1&limit=5", { headers: authHeaders });
  assert(usersList.res.ok, "Users list failed");
  console.log("OK users/list");

  const serversList = await req("/v1/admin/servers", { headers: authHeaders });
  assert(serversList.res.ok, "Servers list failed");
  const serversBody = serversList.body as Json;
  const servers = (serversBody.servers as Json[]) ?? [];
  assert(Array.isArray(servers), "Servers payload invalid");
  console.log("OK servers/list");

  if (servers.length > 0) {
    const firstId = String((servers[0] as Json).id ?? "");
    const healthRes = await req(`/v1/admin/servers/${firstId}/health`, { headers: authHeaders });
    assert(healthRes.res.ok, "Server health failed");
    console.log("OK servers/health");
  }

  const dashboardMetrics = await req("/v1/admin/dashboard/metrics", { headers: authHeaders });
  assert(dashboardMetrics.res.ok, "Dashboard metrics failed");
  console.log("OK dashboard/metrics");

  const dashboardTickets = await req("/v1/admin/dashboard/tickets", { headers: authHeaders });
  assert(dashboardTickets.res.ok, "Dashboard tickets analytics failed");
  console.log("OK dashboard/tickets");

  const dashboardNotifications = await req("/v1/admin/dashboard/notifications", { headers: authHeaders });
  assert(dashboardNotifications.res.ok, "Dashboard notifications analytics failed");
  console.log("OK dashboard/notifications");

  const adminActivity = await req("/v1/admin/dashboard/admin-activity", { headers: authHeaders });
  assert(adminActivity.res.ok, "Dashboard admin activity failed");
  console.log("OK dashboard/admin-activity");

  const tickets = await req("/v1/admin/tickets/all?page=1&limit=5", { headers: authHeaders });
  assert(tickets.res.ok, "Tickets list failed");
  console.log("OK tickets/list");

  const ticketsExport = await req("/v1/admin/tickets/export?format=csv", { headers: authHeaders });
  assert(ticketsExport.res.ok, "Tickets export failed");
  console.log("OK tickets/export");

  const backupCreate = await req("/v1/admin/settings/backups", { method: "POST", headers: authHeaders });
  assert(backupCreate.res.ok, "Backup create failed");
  const backup = backupCreate.body as Json;
  const backupId = String(backup.id ?? "");
  const backupFilename = String(backup.filename ?? "");
  assert(backupId.length > 0, "Backup id missing");
  assert(backupFilename.length > 0, "Backup filename missing");
  console.log("OK settings/backups:create");

  const backupDownload = await req(`/v1/admin/settings/backups/${encodeURIComponent(backupFilename)}/download`, { headers: authHeaders });
  assert(backupDownload.res.ok, "Backup download failed");
  console.log("OK settings/backups:download");

  const backupRestore = await req(`/v1/admin/settings/backups/${backupId}/restore`, {
    method: "POST",
    headers: authHeaders,
  });
  assert(backupRestore.res.ok, "Backup restore failed");
  console.log("OK settings/backups:restore");

  console.log("Smoke admin: PASSED");
}

main().catch((error) => {
  console.error("Smoke admin: FAILED");
  console.error(error);
  process.exit(1);
});
