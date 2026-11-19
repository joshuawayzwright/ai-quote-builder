const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../lib.js');

test('formatAUD formats cents with thousands separators', () => {
  assert.equal(Q.formatAUD(0), '$0.00');
  assert.equal(Q.formatAUD(123456789), '$1,234,567.89');
  assert.equal(Q.formatAUD(-505), '-$5.05');
});

test('toCents handles strings with $ and commas and avoids float drift', () => {
  assert.equal(Q.toCents('$1,234.50'), 123450);
  assert.equal(Q.toCents(0.1 + 0.2), 30);
  assert.ok(Number.isNaN(Q.toCents('abc')));
});

test('GST is 10% of the subtotal when registered, rounded to the cent', () => {
  const t = Q.computeQuote([{ description: 'Mow', qty: 3, unitPrice: '33.33' }], { gstRegistered: true });
  assert.equal(t.subtotalCents, 9999);
  assert.equal(t.gstCents, 1000);
  assert.equal(t.totalCents, 10999);
  assert.deepEqual(t.errors, []);
});

test('no GST when not registered', () => {
  const t = Q.computeQuote([{ description: 'Clean', qty: 1, unitPrice: 200 }], { gstRegistered: false });
  assert.equal(t.gstCents, 0);
  assert.equal(t.totalCents, 20000);
});

test('deposit and balance add up to the total', () => {
  const t = Q.computeQuote([{ description: 'Job', qty: 1, unitPrice: 333.33 }], { gstRegistered: true, depositPercent: 30 });
  assert.equal(t.depositCents + t.balanceCents, t.totalCents);
  assert.equal(t.depositCents, Math.round(t.totalCents * 0.3));
});

test('invalid lines are reported and excluded; empty rows are ignored', () => {
  const t = Q.computeQuote([
    { description: '', qty: '', unitPrice: '' },
    { description: 'Parts', qty: 0, unitPrice: 10 },
    { description: '', qty: 1, unitPrice: 5 }
  ]);
  assert.equal(t.lines.length, 0);
  assert.equal(t.errors.length, 2);
  assert.match(t.errors[0], /Line 2: quantity/);
  assert.match(t.errors[1], /Line 3: add a description/);
});

test('asks for at least one item when nothing is entered', () => {
  assert.deepEqual(Q.computeQuote([]).errors, ['Add at least one line item.']);
});

test('deposit outside 0-100 is rejected', () => {
  const t = Q.computeQuote([{ description: 'x', qty: 1, unitPrice: 1 }], { depositPercent: 150 });
  assert.equal(t.depositCents, 0);
  assert.match(t.errors[0], /Deposit/);
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(Q.addDays('2026-12-20', 14), '2027-01-03');
  assert.equal(Q.formatDate('2027-01-03'), '03/01/2027');
});

test('quote text includes totals, validity and lists', () => {
  const details = {
    businessName: 'Gold Coast Gardens', abn: '12 345 678 901', clientName: 'Sam', quoteNumber: 'Q-7',
    quoteDate: '2026-11-19', validDays: 30, gstRegistered: true, jobSummary: 'Front yard tidy',
    inclusions: 'Mowing\nEdging', exclusions: 'Tree removal', depositPercent: 20
  };
  const totals = Q.computeQuote([{ description: 'Labour', qty: 2, unitPrice: 80 }], details);
  const text = Q.buildQuoteText(details, totals);
  assert.match(text, /QUOTE #Q-7/);
  assert.match(text, /ABN 12 345 678 901/);
  assert.match(text, /Valid until: 19\/12\/2026/);
  assert.match(text, /GST \(10%\): \$16\.00/);
  assert.match(text, /TOTAL \(incl\. GST\): \$176\.00/);
  assert.match(text, /NOT INCLUDED\n  - Tree removal/);
  assert.match(text, /Deposit \(20%\) to book: \$35\.20/);
});

test('AI prompt tells the assistant not to change prices', () => {
  const totals = Q.computeQuote([{ description: 'Labour', qty: 1, unitPrice: 50 }]);
  const prompt = Q.buildAiPrompt({}, totals);
  assert.match(prompt, /Do NOT change any prices/);
  assert.match(prompt, /--- QUOTE DRAFT ---/);
  assert.match(prompt, /Not registered for GST/);
});
