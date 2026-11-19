/* Quote maths and text output. Pure functions: no DOM, no network. */
(function (root) {
  'use strict';

  var GST_RATE = 0.1;

  function toCents(value) {
    var n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[$,\s]/g, ''));
    if (!isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  function formatAUD(cents) {
    var negative = cents < 0;
    var abs = Math.abs(Math.round(cents));
    var dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var rest = String(abs % 100).padStart(2, '0');
    return (negative ? '-$' : '$') + dollars + '.' + rest;
  }

  function addDays(isoDate, days) {
    var parts = String(isoDate).split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (p) { return !isFinite(p); })) return '';
    var d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    d.setUTCDate(d.getUTCDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  }

  function formatDate(isoDate) {
    var parts = String(isoDate).split('-');
    if (parts.length !== 3) return isoDate;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  /**
   * items: [{ description, qty, unitPrice }] where unitPrice is dollars excluding GST.
   * Returns totals in cents plus a list of problems found in the input.
   */
  function computeQuote(items, options) {
    options = options || {};
    var errors = [];
    var lines = [];
    (items || []).forEach(function (item, index) {
      var description = String(item.description || '').trim();
      var qty = Number(item.qty);
      var unitCents = toCents(item.unitPrice);
      var label = 'Line ' + (index + 1);
      if (!description && !item.unitPrice && !item.qty) return; // ignore fully empty rows
      if (!description) errors.push(label + ': add a description.');
      if (!isFinite(qty) || qty <= 0) errors.push(label + ': quantity must be more than 0.');
      if (!isFinite(unitCents) || unitCents < 0) errors.push(label + ': price must be 0 or more.');
      if (description && isFinite(qty) && qty > 0 && isFinite(unitCents) && unitCents >= 0) {
        lines.push({ description: description, qty: qty, unitCents: unitCents, totalCents: Math.round(qty * unitCents) });
      }
    });
    if (lines.length === 0 && errors.length === 0) errors.push('Add at least one line item.');

    var subtotalCents = lines.reduce(function (sum, l) { return sum + l.totalCents; }, 0);
    var gstCents = options.gstRegistered ? Math.round(subtotalCents * GST_RATE) : 0;
    var totalCents = subtotalCents + gstCents;
    var depositPercent = Number(options.depositPercent || 0);
    if (!isFinite(depositPercent) || depositPercent < 0 || depositPercent > 100) {
      errors.push('Deposit must be between 0% and 100%.');
      depositPercent = 0;
    }
    var depositCents = Math.round(totalCents * depositPercent / 100);
    return {
      lines: lines,
      subtotalCents: subtotalCents,
      gstCents: gstCents,
      totalCents: totalCents,
      depositPercent: depositPercent,
      depositCents: depositCents,
      balanceCents: totalCents - depositCents,
      errors: errors
    };
  }

  function listBlock(title, text) {
    var rows = String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!rows.length) return '';
    return '\n' + title + '\n' + rows.map(function (r) { return '  - ' + r; }).join('\n') + '\n';
  }

  function buildQuoteText(details, totals) {
    var d = details || {};
    var out = [];
    out.push((d.gstRegistered ? 'TAX INVOICE QUOTE' : 'QUOTE') + (d.quoteNumber ? ' #' + d.quoteNumber : ''));
    out.push('');
    out.push('From: ' + (d.businessName || '[Your business]') + (d.abn ? ' (ABN ' + d.abn + ')' : ''));
    if (d.businessContact) out.push('      ' + d.businessContact);
    out.push('To:   ' + (d.clientName || '[Client]'));
    if (d.quoteDate) out.push('Date: ' + formatDate(d.quoteDate));
    if (d.quoteDate && d.validDays) out.push('Valid until: ' + formatDate(addDays(d.quoteDate, d.validDays)));
    out.push('');
    if (d.jobSummary) { out.push('JOB'); out.push(String(d.jobSummary).trim()); out.push(''); }
    out.push('ITEMS' + (d.gstRegistered ? ' (prices exclude GST)' : ''));
    totals.lines.forEach(function (l) {
      out.push('  ' + l.description + ' — ' + l.qty + ' × ' + formatAUD(l.unitCents) + ' = ' + formatAUD(l.totalCents));
    });
    out.push('');
    out.push('Subtotal: ' + formatAUD(totals.subtotalCents));
    if (d.gstRegistered) out.push('GST (10%): ' + formatAUD(totals.gstCents));
    out.push('TOTAL' + (d.gstRegistered ? ' (incl. GST)' : '') + ': ' + formatAUD(totals.totalCents));
    if (!d.gstRegistered) out.push('Not registered for GST. No GST has been charged.');
    if (totals.depositCents > 0) {
      out.push('Deposit (' + totals.depositPercent + '%) to book: ' + formatAUD(totals.depositCents));
      out.push('Balance on completion: ' + formatAUD(totals.balanceCents));
    }
    var extra = listBlock('INCLUDED', d.inclusions) + listBlock('ASSUMPTIONS', d.assumptions) + listBlock('NOT INCLUDED', d.exclusions);
    if (extra) out.push(extra.replace(/\n$/, ''));
    if (d.paymentTerms) { out.push(''); out.push('PAYMENT TERMS'); out.push(String(d.paymentTerms).trim()); }
    out.push('');
    out.push('To accept this quote, reply to confirm' + (totals.depositCents > 0 ? ' and pay the deposit.' : '.'));
    return out.join('\n');
  }

  function buildAiPrompt(details, totals) {
    var d = details || {};
    return [
      'You are helping an Australian sole trader polish a quote before sending it.',
      'Rewrite the job summary, inclusions, assumptions and exclusions so they are clear, friendly and specific.',
      'Do NOT change any prices, quantities, totals, GST or dates. Do NOT invent work that is not listed.',
      'Flag anything ambiguous that could cause a dispute, and suggest one question to ask the client.',
      'Use Australian English.',
      '',
      '--- QUOTE DRAFT ---',
      buildQuoteText(d, totals)
    ].join('\n');
  }

  var api = {
    GST_RATE: GST_RATE,
    toCents: toCents,
    formatAUD: formatAUD,
    addDays: addDays,
    formatDate: formatDate,
    computeQuote: computeQuote,
    buildQuoteText: buildQuoteText,
    buildAiPrompt: buildAiPrompt
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QuoteLib = api;
})(this);
