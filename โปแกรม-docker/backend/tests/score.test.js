const test = require('node:test');
const assert = require('node:assert/strict');
const { percentage, scoreValid } = require('../helpers');
const items = [
  { id: 1, score_type: 'scale4', weight: 60 },
  { id: 2, score_type: 'boolean', weight: 20 },
  { id: 3, score_type: 'scale4', weight: 20 },
];
test('ถ่วงน้ำหนักได้ 85 และ 75 โดย 0 คือคะแนนจริง', () => {
  assert.equal(
    percentage(items, [
      { indicator_id: 1, score: 4 },
      { indicator_id: 2, score: 1 },
      { indicator_id: 3, score: 1 },
    ]),
    85,
  );
  assert.equal(
    percentage(items, [
      { indicator_id: 1, score: 4 },
      { indicator_id: 2, score: 0 },
      { indicator_id: 3, score: 3 },
    ]),
    75,
  );
});
test('คะแนนไม่ครบต้องยังไม่มีผล', () => assert.equal(percentage(items, []), null));
test('ปฏิเสธคะแนนผิดชนิด', () => {
  assert.equal(scoreValid(items[0], 0), false);
  assert.equal(scoreValid(items[1], 4), false);
});
