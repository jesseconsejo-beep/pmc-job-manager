// Database test harness: boots an embedded Postgres, installs the Supabase
// stubs, applies every migration in order, then attacks the RLS as different
// users. Run with `npm test` from supabase/tests.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '..', 'migrations');
const PORT = 54329;

const epg = new EmbeddedPostgres({
  databaseDir: path.join(here, '.pgdata'),
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: false,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

let client;
let failures = 0;
let passes = 0;

// Run SQL as a given user (uuid), as anon ('anon'), or as the service/SQL-editor context (null).
async function as(user, sql, params = []) {
  await client.query('begin');
  try {
    if (user === 'anon') {
      await client.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
      await client.query('set local role anon');
    } else if (user) {
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: user, role: 'authenticated' }),
      ]);
      await client.query('set local role authenticated');
    }
    const r = await client.query(sql, params);
    await client.query('commit');
    return r;
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}

async function test(name, fn) {
  try {
    await fn();
    passes++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`);
  }
}

async function expectError(promise, pattern) {
  let err;
  try { await promise; } catch (e) { err = e; }
  if (!err) throw new Error(`expected an error matching ${pattern}, got none`);
  if (!pattern.test(err.message)) throw new Error(`expected /${pattern.source}/, got: ${err.message}`);
}

function eq(actual, expected, label) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}: expected ${b}, got ${a}`);
}

const RLS = /row-level security|permission denied/i;

async function main() {
  console.log('starting embedded postgres…');
  await epg.initialise();
  await epg.start();
  await epg.createDatabase('pmc_test');
  client = new pg.Client({ host: '127.0.0.1', port: PORT, user: 'postgres', password: 'postgres', database: 'pmc_test' });
  await client.connect();

  await client.query(readFileSync(path.join(here, 'stubs.sql'), 'utf8'));
  // MIGRATE_UPTO=0001 applies only migrations up to that prefix (proves the suite bites on the baseline)
  const upto = process.env.MIGRATE_UPTO;
  for (const f of readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && (!upto || f.slice(0, 4) <= upto)).sort()) {
    await client.query(readFileSync(path.join(migrationsDir, f), 'utf8'));
    console.log(`applied ${f}`);
  }

  // ---------- fixture: people ----------
  const signup = async (email, name) =>
    (await as(null, `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
      [email, JSON.stringify({ name })])).rows[0].id;

  // Matt signs up with no invite, then the documented bootstrap line is run
  const matt = await signup('matt@example.test', 'Matt');
  await as(null, `update profiles set role = 'owner', active = true where id = $1`, [matt]);

  // Matt invites the crew; Supabase's admin invite then creates the auth users
  // On the unhardened baseline there is no invites table; keep going so the attacks can be shown to succeed.
  const invite = (email, role, name) =>
    as(matt, `insert into invites (email, role, name) values ($1, $2, $3)`, [email, role, name]).catch(e => {
      if (!/relation "invites" does not exist/.test(e.message)) throw e;
    });
  await invite('scott@example.test', 'pm', 'Scott');
  await invite('dan@example.test', 'foreman', 'Dan');
  await invite('eve@example.test', 'foreman', 'Eve');
  await invite('fired@example.test', 'journeyman', 'Fired');
  const scott = await signup('scott@example.test', 'Scott Bell');
  const dan = await signup('dan@example.test', 'Dan');
  const eve = await signup('eve@example.test', 'Eve');
  const fired = await signup('fired@example.test', 'Fired');
  const rando = await signup('rando@example.test', 'Rando'); // no invite
  await as(matt, `update profiles set active = false where id = $1`, [fired]);

  const job = (await as(matt, `insert into jobs (job_number, job_name) values ('M2026-01', 'Test job') returning id`)).rows[0].id;
  await as(matt, `insert into job_assignments (job_id, user_id) values ($1, $2)`, [job, eve]);

  console.log('\ninvites + activation');
  await test('invited users are active with the invited role', async () => {
    const r = await as(null, `select email, role, active from profiles where id in ($1,$2) order by email`, [scott, dan]);
    eq(r.rows, [
      { email: 'dan@example.test', role: 'foreman', active: true },
      { email: 'scott@example.test', role: 'pm', active: true },
    ], 'profiles');
    const inv = await as(null, `select count(*)::int as n from invites where accepted_at is not null`);
    eq(inv.rows[0].n, 4, 'accepted invites');
  });
  await test('uninvited signup is parked inactive and sees no jobs', async () => {
    const p = await as(null, `select role, active from profiles where id = $1`, [rando]);
    eq(p.rows[0], { role: 'viewer', active: false }, 'profile');
    const j = await as(rando, `select count(*)::int as n from jobs`);
    eq(j.rows[0].n, 0, 'visible jobs');
    await expectError(as(rando, `insert into jobs (job_name) values ('x')`), RLS);
  });
  await test('uninvited user can read own profile only', async () => {
    const r = await as(rando, `select count(*)::int as n from profiles`);
    eq(r.rows[0].n, 1, 'visible profiles');
  });
  await test('deactivated user sees nothing', async () => {
    const j = await as(fired, `select count(*)::int as n from jobs`);
    eq(j.rows[0].n, 0, 'visible jobs');
    const t = await as(fired, `select count(*)::int as n from tasks`);
    eq(t.rows[0].n, 0, 'visible tasks');
  });
  await test('anon sees nothing', async () => {
    const j = await as('anon', `select count(*)::int as n from jobs`);
    eq(j.rows[0].n, 0, 'visible jobs');
  });
  await test('PM cannot invite an owner; owner can', async () => {
    await expectError(as(scott, `insert into invites (email, role) values ('x@example.test','owner')`), /Only an owner can invite an owner/);
    await as(matt, `insert into invites (email, role) values ('x@example.test','owner')`);
  });
  await test('foreman cannot read or create invites', async () => {
    const r = await as(dan, `select count(*)::int as n from invites`);
    eq(r.rows[0].n, 0, 'visible invites');
    await expectError(as(dan, `insert into invites (email, role) values ('y@example.test','foreman')`), RLS);
  });

  console.log('\nprofiles / privilege escalation');
  await test('foreman cannot promote self to owner', async () => {
    await expectError(as(dan, `update profiles set role = 'owner' where id = $1`, [dan]), /Only owners or PMs/);
  });
  await test('foreman can edit own name and phone', async () => {
    const r = await as(dan, `update profiles set name = 'Dan F', phone = '604-555-0100' where id = $1`, [dan]);
    eq(r.rowCount, 1, 'rows updated');
  });
  await test('foreman cannot edit another profile', async () => {
    const r = await as(dan, `update profiles set name = 'hacked' where id = $1`, [eve]);
    eq(r.rowCount, 0, 'rows updated');
  });
  await test('PM can change a role but not grant owner', async () => {
    await as(scott, `update profiles set role = 'superintendent' where id = $1`, [dan]);
    await expectError(as(scott, `update profiles set role = 'owner' where id = $1`, [dan]), /Only an owner can grant/);
    await as(matt, `update profiles set role = 'foreman' where id = $1`, [dan]);
  });
  await test('owner cannot change own role or deactivate self', async () => {
    await expectError(as(matt, `update profiles set role = 'pm' where id = $1`, [matt]), /cannot change your own/);
    await expectError(as(matt, `update profiles set active = false where id = $1`, [matt]), /cannot change your own/);
  });

  console.log('\ntimesheets');
  const W1 = '2026-09-27', W2 = '2026-10-04';
  const danSheet = (await as(dan,
    `insert into timesheets (employee_id, week1_ending, week2_ending, approved, approved_by, approved_at)
     values ($1, $2, $3, true, $4, now()) returning id, approved, approved_by, approved_at`,
    [dan, W1, W2, matt])).rows[0];
  await test('employee cannot insert a pre-approved sheet', async () => {
    eq({ approved: danSheet.approved, by: danSheet.approved_by, at: danSheet.approved_at }, { approved: false, by: null, at: null }, 'stored');
  });
  await test('employee cannot file a sheet for someone else', async () => {
    const r = await as(dan,
      `insert into timesheets (employee_id, week1_ending, week2_ending) values ($1, '2026-10-11', '2026-10-18') returning employee_id`, [scott]);
    eq(r.rows[0].employee_id, dan, 'employee_id forced to actor');
  });
  await test('employee cannot approve own sheet', async () => {
    await expectError(as(dan, `update timesheets set approved = true where id = $1`, [danSheet.id]), /row-level security|Self-approval/);
  });
  await test('foreman cannot see another employee\'s sheet', async () => {
    const r = await as(eve, `select count(*)::int as n from timesheets`);
    eq(r.rows[0].n, 0, 'visible sheets');
  });
  await test('PM approval stamps the real approver (spoof ignored)', async () => {
    const r = await as(scott, `update timesheets set approved = true, approved_by = $2 where id = $1 returning approved_by, approved_at`, [danSheet.id, dan]);
    eq(r.rows[0].approved_by, scott, 'approved_by');
    if (!r.rows[0].approved_at) throw new Error('approved_at not set');
  });
  await test('approved sheet is locked for the employee', async () => {
    const r = await as(dan, `update timesheets set notes = 'late edit' where id = $1`, [danSheet.id]);
    eq(r.rowCount, 0, 'rows updated');
    const check = await as(null, `select notes from timesheets where id = $1`, [danSheet.id]);
    eq(check.rows[0].notes, null, 'notes unchanged');
  });
  await test('employee cannot un-approve; PM can', async () => {
    const r = await as(dan, `update timesheets set approved = false where id = $1`, [danSheet.id]);
    eq(r.rowCount, 0, 'rows updated by employee');
    const ok = await as(scott, `update timesheets set approved = false where id = $1 returning approved_by`, [danSheet.id]);
    eq(ok.rows[0].approved_by, null, 'approver cleared');
  });
  await test('PM cannot self-approve', async () => {
    const own = (await as(scott, `insert into timesheets (employee_id, week1_ending, week2_ending) values ($1, $2, $3) returning id`, [scott, W1, W2])).rows[0].id;
    await expectError(as(scott, `update timesheets set approved = true where id = $1`, [own]), /Self-approval/);
    await as(matt, `update timesheets set approved = true where id = $1`, [own]);
  });
  await test('only admins delete timesheets', async () => {
    const r = await as(dan, `delete from timesheets where id = $1`, [danSheet.id]);
    eq(r.rowCount, 0, 'rows deleted by employee');
  });

  console.log('\npay period setting');
  await test('foreman cannot edit org settings; owner can', async () => {
    const r = await as(dan, `update org_settings set company_name = 'x'`);
    eq(r.rowCount, 0, 'rows updated by foreman');
    const ok = await as(matt, `update org_settings set pay_period_anchor_end = '2026-10-03' returning updated_by`);
    eq(ok.rows[0].updated_by, matt, 'updated_by stamped');
  });
  await test('pay_period_bounds math from the anchor', async () => {
    const q = async d => (await as(dan, `select period_start::text as s, period_end::text as e from pay_period_bounds($1::date)`, [d])).rows[0];
    eq(await q('2026-10-03'), { s: '2026-09-20', e: '2026-10-03' }, 'on anchor');
    eq(await q('2026-10-04'), { s: '2026-10-04', e: '2026-10-17' }, 'day after anchor');
    eq(await q('2026-10-17'), { s: '2026-10-04', e: '2026-10-17' }, 'on next end');
    eq(await q('2026-10-18'), { s: '2026-10-18', e: '2026-10-31' }, 'day after next end');
    eq(await q('2026-09-19'), { s: '2026-09-06', e: '2026-09-19' }, 'previous period end');
    eq(await q('2026-09-20'), { s: '2026-09-20', e: '2026-10-03' }, 'previous period start');
  });
  await test('timesheet must align to the configured period', async () => {
    await expectError(
      as(eve, `insert into timesheets (employee_id, week1_ending, week2_ending) values ($1, '2026-10-09', '2026-10-16')`, [eve]),
      /must end on 2026-10-17/);
    await expectError(
      as(eve, `insert into timesheets (employee_id, week1_ending, week2_ending) values ($1, '2026-10-09', '2026-10-17')`, [eve]),
      /week1_ending must be 7 days before/);
    const ok = await as(eve, `insert into timesheets (employee_id, week1_ending, week2_ending) values ($1, '2026-10-10', '2026-10-17') returning id`, [eve]);
    eq(ok.rowCount, 1, 'aligned sheet inserted');
  });

  console.log('\njobs / photos / storage');
  await test('foreman cannot delete a job; owner can', async () => {
    const r = await as(dan, `delete from jobs where id = $1`, [job]);
    eq(r.rowCount, 0, 'rows deleted by foreman');
    const tmp = (await as(matt, `insert into jobs (job_name) values ('throwaway') returning id`)).rows[0].id;
    const ok = await as(matt, `delete from jobs where id = $1`, [tmp]);
    eq(ok.rowCount, 1, 'rows deleted by owner');
  });
  await test('foreman cannot assign crew to jobs', async () => {
    await expectError(as(dan, `insert into job_assignments (job_id, user_id) values ($1, $2)`, [job, dan]), RLS);
  });
  const photoPath = `job/${job}/site-1.jpg`;
  await as(matt, `insert into storage.objects (bucket_id, name) values ('photos', $1)`, [photoPath]);
  await as(matt, `insert into photos (job_id, storage_path, taken_by) values ($1, $2, $3)`, [job, photoPath, matt]);
  await test('photo bytes visible only to assigned crew and admins', async () => {
    const see = async u => (await as(u, `select count(*)::int as n from storage.objects where bucket_id = 'photos'`)).rows[0].n;
    eq(await see(dan), 0, 'unassigned foreman');
    eq(await see(eve), 1, 'assigned foreman');
    eq(await see(scott), 1, 'pm');
    eq(await see(fired), 0, 'deactivated');
  });
  await test('photo rows follow the same tiering', async () => {
    const see = async u => (await as(u, `select count(*)::int as n from photos`)).rows[0].n;
    eq(await see(dan), 0, 'unassigned foreman');
    eq(await see(eve), 1, 'assigned foreman');
  });
  await test('upload allowed only under assigned jobs', async () => {
    await expectError(as(dan, `insert into storage.objects (bucket_id, name) values ('photos', $1)`, [`job/${job}/dan.jpg`]), RLS);
    const ok = await as(eve, `insert into storage.objects (bucket_id, name) values ('photos', $1)`, [`job/${job}/eve.jpg`]);
    eq(ok.rowCount, 1, 'assigned upload');
  });
  await test('only the uploader or an admin deletes a photo object', async () => {
    await as(eve, `insert into photos (job_id, storage_path, taken_by) values ($1, $2, $3)`, [job, `job/${job}/eve.jpg`, eve]);
    await as(matt, `insert into job_assignments (job_id, user_id) values ($1, $2)`, [job, dan]);
    const r = await as(dan, `delete from storage.objects where name = $1`, [`job/${job}/eve.jpg`]);
    eq(r.rowCount, 0, 'other crew');
    const ok = await as(eve, `delete from storage.objects where name = $1`, [`job/${job}/eve.jpg`]);
    eq(ok.rowCount, 1, 'uploader');
  });

  console.log('\naudit log');
  await test('activity actor is stamped server-side, spoof ignored', async () => {
    const r = await as(dan,
      `insert into activity_log (job_id, user_id, user_name, event_type, description) values ($1, $2, 'Matt', 'x', 'y') returning user_id, user_name`,
      [job, matt]);
    eq(r.rows[0], { user_id: dan, user_name: 'Dan F' }, 'stamped');
  });
  await test('activity log is append-only for everyone', async () => {
    const r = await as(matt, `delete from activity_log`);
    eq(r.rowCount, 0, 'rows deleted by owner');
    const u = await as(matt, `update activity_log set description = 'edited'`);
    eq(u.rowCount, 0, 'rows updated by owner');
  });

  console.log('\nwhite-label catalogs');
  await test('progress catalog seeded with 11 categories and code refs', async () => {
    const r = await as(dan, `select count(*)::int as n, sum(jsonb_array_length(code_refs))::int as refs from progress_categories`);
    eq(r.rows[0], { n: 11, refs: 68 }, 'catalog');
  });
  await test('role catalog drives admin checks', async () => {
    await as(matt, `update role_catalog set is_admin = true where key = 'office'`);
    await as(matt, `update profiles set role = 'office' where id = $1`, [eve]);
    const r = await as(eve, `select count(*)::int as n from timesheets`);
    if (r.rows[0].n < 2) throw new Error(`office-as-admin should see all sheets, saw ${r.rows[0].n}`);
    await as(matt, `update role_catalog set is_admin = false where key = 'office'`);
    await as(matt, `update profiles set role = 'foreman' where id = $1`, [eve]);
  });

  console.log(`\n${passes} passed, ${failures} failed`);
  await client.end();
  await epg.stop();
  process.exit(failures ? 1 : 0);
}

main().catch(async e => {
  console.error('harness error:', e.message);
  try { await client?.end(); } catch {}
  try { await epg.stop(); } catch {}
  process.exit(2);
});
