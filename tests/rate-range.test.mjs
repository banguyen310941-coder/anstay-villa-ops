import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the actual shipped handlers, with fake fields and a fake API only.
const source = readFileSync(new URL('../public/parts/main-14.txt', import.meta.url), 'utf8');
const handlers = source.slice(source.indexOf('async function rateAction('), source.indexOf('const render_rate12='));
function setup({ published = false, rpcError, rejectRpc, mode = 'auth' } = {}) {
  const fields = Object.fromEntries(Object.entries({
    rateVilla: 'NHAN', ratePlan: '1', rateFrom: '2026-11-20', rateTo: '2026-11-22',
    rateWeekday: '2000000', rateSaturday: '3000000', rateSunday: '2500000', rateMinStay: '2',
  }).map(([id, value]) => [id, { value, addEventListener() {} }]));
  fields.ratePublished = { checked: published };
  fields.rateStopSell = { checked: false };
  let click;
  fields.applyRateRange = { addEventListener(event, fn) { assert.equal(event, 'click'); click = fn; } };
  const calls = [], messages = [], rows = [];
  let syncs = 0, renders = 0, saves = 0;
  const context = {
    $: id => fields[id], current: 'rates', MODE: mode, RATE_UI: { villa: 'NHAN' },
    fillSurchargeForm() {}, fillMappingForm() {}, document: { querySelectorAll: () => [] },
    neon: { async rpc(name, args) { calls.push({ name, args }); if (rejectRpc) throw new Error(rejectRpc); return { error: rpcError }; } },
    vid: () => 42, dbError: error => error.message, console: { error() {} },
    toast: (message, error = false) => messages.push({ message, error }),
    syncRatesRemote: async () => { syncs++; }, render: () => { renders++; },
    D: { rateCalendar: rows }, VILLAS: [{ id: 42, code: 'NHAN' }], STORE: 'test-only',
    localStorage: { setItem() { saves++; } },
    rateDates: () => ['2026-11-20', '2026-11-21', '2026-11-22'], rateRow: () => undefined,
  };
  vm.runInNewContext(handlers + ';bindRates();', context);
  return { fields, click: () => click(), calls, messages, rows, counts: () => ({ syncs, renders, saves }) };
}
for (const published of [false, true]) test(`applies ${published ? 'published' : 'draft'} range`, async () => {
  const app = setup({ published }); await app.click();
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].name, 'set_rate_range');
  assert.deepEqual(JSON.parse(JSON.stringify(app.calls[0].args)), {
    p_villa_id: 42, p_rate_plan_id: 1, p_from: '2026-11-20', p_to: '2026-11-22',
    p_weekday: 2000000, p_saturday: 3000000, p_sunday: 2500000, p_min_stay: 2,
    p_published: published, p_stop_sell: false,
  });
  assert.deepEqual(app.messages, [{ message: published ? 'Đã cập nhật và phát hành bảng giá' : 'Đã lưu bảng giá nháp', error: false }]);
  assert.deepEqual(app.counts(), { syncs: 1, renders: 1, saves: 0 });
});
for (const [field, value, message] of [
  ['rateTo', '2026-11-19', 'Khoảng ngày không hợp lệ'],
  ['rateWeekday', '-1', 'Giá không hợp lệ'],
]) test(`rejects invalid ${field} without saving`, async () => {
  const app = setup(); app.fields[field].value = value; await app.click();
  assert.equal(app.calls.length, 0); assert.deepEqual(app.messages, [{ message, error: true }]);
  assert.deepEqual(app.counts(), { syncs: 0, renders: 0, saves: 0 });
});
for (const options of [{ rpcError: { message: 'Permission denied' } }, { rejectRpc: 'Network unavailable' }]) test(`API failure is caught: ${JSON.stringify(options)}`, async () => {
  const app = setup(options); await app.click();
  assert.equal(app.calls.length, 1); assert.equal(app.messages.length, 1); assert.equal(app.messages[0].error, true);
  assert.equal(app.messages[0].message, options.rejectRpc || options.rpcError.message);
  assert.deepEqual(app.counts(), { syncs: 0, renders: 0, saves: 0 });
});
test('demo updates fake local rows without making API calls', async () => {
  const app = setup({ mode: 'demo' }); await app.click();
  assert.equal(app.calls.length, 0); assert.deepEqual(app.rows.map(row => row.baseRate), [2000000, 3000000, 2500000]);
  assert.ok(app.rows.every(row => row.published === false));
  assert.deepEqual(app.counts(), { syncs: 0, renders: 1, saves: 1 });
});
