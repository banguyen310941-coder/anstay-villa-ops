import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const readPart = n => readFileSync(new URL(`../public/parts/main-${n}.txt`, import.meta.url), 'utf8');
const rates = readPart(14), ota = readPart(21);
test('guide explains partner authorization, mapping, validation and separate iCal limits', () => {
  const html = vm.runInNewContext(rates.slice(rates.indexOf('function otaMappingGuide'), rates.indexOf('function rates()')) + ';otaMappingGuide()');
  assert.match(html, /id="otaMappingGuide"/);
  assert.equal((html.match(/<li>/g) || []).length, 3);
  assert.match(html, /Lưu ghép mã không tự kết nối OTA/);
  assert.match(html, /Màn hình này chưa hỗ trợ kết nối iCal/);
  assert.match(html, /Không nhập mật khẩu/);
  assert.match(rates, /Đủ 3 mã · chưa xác minh kết nối/);
  assert.doesNotMatch(rates, /Sẵn sàng adapter/);
});
test('guide shortcut opens the correct view and scrolls without backend calls', () => {
  let click;
  const events = [];
  const context = {
    current: 'websales',
    $: id => id === 'otaMappingGuide' ? { scrollIntoView: x => events.push(x.block) } :
      id === 'openRatesFromOta' ? { addEventListener: (event, fn) => { assert.equal(event, 'click'); click = fn; } } : null,
    renderNav: () => events.push('nav'), render: () => events.push('render'),
    document: { querySelectorAll: () => [] },
    neon: { rpc: () => assert.fail('No API write allowed') },
  };
  vm.runInNewContext(ota.slice(ota.indexOf('function bindOtaControl'), ota.indexOf('const render_v15')) + ';bindOtaControl()', context);
  click();
  assert.equal(context.current, 'rates');
  assert.deepEqual(events, ['nav', 'render', 'start']);
});

test('readiness counts known villas only after all three IDs are populated', () => {
  const mapping = (villaId, fields = {}) => ({
    channelId: 1, active: true, villaId, externalProperty: 'P', externalRoom: 'R', externalPlan: 'T', ...fields,
  });
  const context = { D: { channelMappings: [
    mapping(11), mapping(11, { externalPlan: 'T2' }),
    mapping(12, { externalProperty: '' }), mapping(12, { externalRoom: '' }),
    mapping(12, { externalPlan: '  ' }), mapping(12, { active: false }),
    mapping(13, { channelId: 2 }), mapping(999),
  ] }, VILLAS: [{ id: 11 }, { id: 12 }, { id: 13 }] };
  const readiness = rates.slice(rates.indexOf('function rateChannelReadiness'), rates.indexOf('function otaMappingGuide'));
  const stats = ota.slice(ota.indexOf('function otaSyncStats'), ota.indexOf('function otaControlCard'));
  vm.runInNewContext(readiness + stats, context);
  const direct = vm.runInNewContext("rateChannelReadiness({id:1,type:'ota'})", context);
  const card = vm.runInNewContext("otaSyncStats({id:1,type:'ota',code:'OTA'})", context);
  assert.equal(direct.ready, 1);
  assert.equal(card.ready, 1);
  assert.equal(card.maps, 6);
  assert.match(ota, /Kết nối máy chủ: chưa xác minh tại màn hình này/);
});
