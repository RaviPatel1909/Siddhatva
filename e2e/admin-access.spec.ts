import { test, expect, request, APIRequestContext } from '@playwright/test';
import { ADMIN, CUSTOMER } from './testCredentials';

// Every /admin route must reject the unauthenticated (401) and non-admins (403).
// This guards the requireAuth → requireAdmin gating across the whole surface.
//
// Prerequisite: seeded database (see e2e/README.md).

const API = 'http://localhost:4000/api';

async function login(rc: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await rc.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok(), `login ${email}`).toBeTruthy();
  return (await res.json()).accessToken as string;
}

type Method = 'get' | 'post' | 'patch' | 'delete';
const ADMIN_ROUTES: { method: Method; path: string; data?: unknown }[] = [
  { method: 'get', path: '/admin/orders' },
  { method: 'get', path: '/admin/stats' },
  { method: 'get', path: '/admin/upload-signature' },
  { method: 'post', path: '/admin/upload-dev' },
  { method: 'get', path: '/admin/products/1' },
  { method: 'post', path: '/admin/products', data: { name: 'x' } },
  { method: 'patch', path: '/admin/products/1', data: { name: 'x' } },
  { method: 'delete', path: '/admin/products/nope' },
  { method: 'post', path: '/admin/products/bulk-delete', data: { ids: ['nope'] } },
  { method: 'patch', path: '/admin/products/bulk-status', data: { ids: ['nope'], status: 'draft' } },
  { method: 'patch', path: '/admin/orders/nope/status', data: { status: 'shipped' } },
];

test('every /admin route rejects the unauthenticated (401) and customers (403)', async () => {
  const rc = await request.newContext();
  const customerToken = await login(rc, CUSTOMER.email, CUSTOMER.password);

  for (const r of ADMIN_ROUTES) {
    const label = `${r.method.toUpperCase()} ${r.path}`;

    const anon = await rc[r.method](`${API}${r.path}`, { data: r.data });
    expect(anon.status(), `${label} — unauthenticated should be 401`).toBe(401);

    const asCustomer = await rc[r.method](`${API}${r.path}`, {
      data: r.data,
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(asCustomer.status(), `${label} — customer should be 403`).toBe(403);
  }

  // Sanity: the admin CAN reach a representative route (gating isn't blanket-deny).
  const adminToken = await login(rc, ADMIN.email, ADMIN.password);
  const adminOk = await rc.get(`${API}/admin/orders`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(adminOk.status(), 'admin GET /admin/orders should be 200').toBe(200);

  await rc.dispose();
});
