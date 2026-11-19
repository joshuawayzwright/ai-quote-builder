(function () {
  'use strict';
  var Q = window.QuoteLib;
  var $ = function (id) { return document.getElementById(id); };
  var fields = ['businessName', 'abn', 'businessContact', 'clientName', 'quoteNumber', 'quoteDate', 'validDays',
    'jobSummary', 'inclusions', 'assumptions', 'exclusions', 'depositPercent', 'paymentTerms'];
  var itemsEl = $('items');
  var itemCount = 0;

  function addItem(values) {
    values = values || {};
    itemCount += 1;
    var n = itemCount;
    var row = document.createElement('div');
    row.className = 'line-item';
    row.innerHTML =
      '<div><label for="d' + n + '">Description</label><input id="d' + n + '" data-k="description"></div>' +
      '<div><label for="q' + n + '">Qty</label><input id="q' + n + '" data-k="qty" type="number" min="0" step="any" inputmode="decimal"></div>' +
      '<div><label for="p' + n + '">Unit price ($)</label><input id="p' + n + '" data-k="unitPrice" type="number" min="0" step="0.01" inputmode="decimal"></div>' +
      '<div><button type="button" class="link" aria-label="Remove line">Remove</button></div>';
    row.querySelector('[data-k=description]').value = values.description || '';
    row.querySelector('[data-k=qty]').value = values.qty == null ? 1 : values.qty;
    row.querySelector('[data-k=unitPrice]').value = values.unitPrice || '';
    row.querySelector('button').addEventListener('click', function () { row.remove(); render(); });
    itemsEl.appendChild(row);
  }

  function readItems() {
    return Array.prototype.map.call(itemsEl.querySelectorAll('.line-item'), function (row) {
      var get = function (k) { return row.querySelector('[data-k=' + k + ']').value; };
      return { description: get('description'), qty: get('qty'), unitPrice: get('unitPrice') };
    });
  }

  function readDetails() {
    var d = {};
    fields.forEach(function (f) { d[f] = $(f).value; });
    d.gstRegistered = $('gstRegistered').checked;
    return d;
  }

  var current = { text: '', prompt: '' };

  function render() {
    var d = readDetails();
    var totals = Q.computeQuote(readItems(), d);
    $('s-sub').textContent = Q.formatAUD(totals.subtotalCents);
    $('s-gst').textContent = Q.formatAUD(totals.gstCents);
    $('s-total').textContent = Q.formatAUD(totals.totalCents);
    $('s-dep').textContent = Q.formatAUD(totals.depositCents);
    $('errors').textContent = totals.errors.join(' ');
    current.text = Q.buildQuoteText(d, totals);
    current.prompt = Q.buildAiPrompt(d, totals);
    $('output').textContent = current.text;
  }

  function say(msg) { $('status').textContent = msg; }

  function copy(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { say(done); }, function () { say('Copy blocked: select the text and copy it instead.'); });
    } else {
      say('Copy isn\'t available here: select the text and copy it instead.');
    }
  }

  function download() {
    var name = 'quote' + ($('quoteNumber').value ? '-' + $('quoteNumber').value.replace(/[^\w-]+/g, '') : '') + '.txt';
    var url = URL.createObjectURL(new Blob([current.text], { type: 'text/plain;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    say('Downloaded ' + name + '.');
  }

  $('quoteDate').value = new Date().toISOString().slice(0, 10);
  addItem({ description: 'Labour', qty: 1 });
  $('add-item').addEventListener('click', function () { addItem(); render(); itemsEl.lastChild.querySelector('input').focus(); });
  $('quote-form').addEventListener('input', render);
  $('quote-form').addEventListener('change', render);
  $('quote-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('copy').addEventListener('click', function () { copy(current.text, 'Quote copied.'); });
  $('copy-ai').addEventListener('click', function () { copy(current.prompt, 'AI prompt copied. Paste it into your AI assistant.'); });
  $('download').addEventListener('click', download);
  $('print').addEventListener('click', function () { window.print(); });
  render();
})();
