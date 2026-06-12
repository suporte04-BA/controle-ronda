// Full integration test - simulates actual user flow
const S = "https://rdmbayprbfqbjhfqcasp.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w";
const WORKER = "https://controle-ronda.suporte04.workers.dev";

console.log("=== 1. Login as suporte04 ===");
const loginRes = await fetch(`${S}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: ANON },
  body: JSON.stringify({ email: "suporte04@baeletrica.com.br", password: "sjr183039" }),
});
const login = await loginRes.json();
if (login.error) { console.error("LOGIN FAILED:", login); process.exit(1); }
const token = login.access_token;
const userId = login.user?.id;
console.log("OK - userId:", userId);

console.log("\n=== 2. Test server function via RPC ===");
// TanStack Start server functions are called via RPC
const rpcRes = await fetch(`${WORKER}/_server`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "X-Server-Fn": "true",
  },
  body: JSON.stringify({
    id: "src/lib/access.functions.ts-syncCurrentUserAccess",
    data: {},
  }),
});
console.log("RPC status:", rpcRes.status);
const rpcBody = await rpcRes.text();
console.log("RPC body (first 500 chars):", rpcBody.substring(0, 500));

console.log("\n=== 3. Test SSR of admin page ===");
const adminRes = await fetch(`${WORKER}/admin`, {
  headers: { "Cookie": `sb-access-token=${token}; sb-refresh-token=${login.refresh_token}` },
});
console.log("Admin SSR status:", adminRes.status);
const adminHtml = await adminRes.text();
if (adminHtml.includes("Algo deu errado")) {
  console.log("ERROR: Admin page contains 'Algo deu errado' in SSR!");
  // Extract the error details
  const errorMatch = adminHtml.match(/error["\s]*:["\s]*"([^"]+)"/);
  if (errorMatch) console.log("Error detail:", errorMatch[1]);
} else if (adminHtml.includes("__root__")) {
  console.log("OK: Admin SSR renders route tree properly");
} else {
  console.log("Admin SSR response (first 300):", adminHtml.substring(0, 300));
}

console.log("\n=== 4. Test SSR of login page ===");
const loginSSR = await fetch(`${WORKER}/login`);
console.log("Login SSR status:", loginSSR.status);
const loginHtml = await loginSSR.text();
if (loginHtml.includes("Algo deu errado")) {
  console.log("ERROR: Login page contains 'Algo deu errado'!");
} else {
  console.log("OK: Login SSR renders properly");
}

console.log("\n=== 5. Test main JS bundle ===");
const indexMatch = loginHtml.match(/src="\/assets\/(index-[A-Za-z0-9_-]+\.js)"/);
if (indexMatch) {
  const jsUrl = `${WORKER}/assets/${indexMatch[1]}`;
  console.log("Fetching:", jsUrl);
  const jsRes = await fetch(jsUrl);
  console.log("JS status:", jsRes.status, "| size:", (await jsRes.text()).length);
}

console.log("\n=== 6. Test SSR of app page ===");
const appRes = await fetch(`${WORKER}/app`, {
  headers: { "Cookie": `sb-access-token=${token}; sb-refresh-token=${login.refresh_token}` },
});
console.log("App SSR status:", appRes.status);
const appHtml = await appRes.text();
if (appHtml.includes("Algo deu errado")) {
  console.log("ERROR: App page contains 'Algo deu errado' in SSR!");
} else {
  console.log("OK: App SSR renders properly");
}

console.log("\n=== DONE ===");
