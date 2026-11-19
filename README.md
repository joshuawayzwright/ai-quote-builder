# AI Quote Builder

A free quote builder for Australian sole traders. Add your line items and it works out GST, the total and the deposit, and writes a clear quote with what's included, your assumptions and what isn't included.

**[Open the app](https://joshuawayzwright.github.io/ai-quote-builder/)**

## Features

- Line items with quantity and unit price
- GST at 10% if you're registered, or a "no GST charged" line if you're not
- Deposit to book, and the balance on completion
- Quote number, date and a "valid until" date
- Included, assumptions and not-included lists, so there are no surprises later
- Copy, download as `.txt`, or print / save as PDF
- An AI prompt that tidies your wording without touching the prices
- Works on phones, in light and dark mode

## Privacy

Everything runs in your browser. The app has no server, accounts, cookies, analytics or tracking, and it doesn't send what you type anywhere. Nothing is saved: close the tab and it's gone. A strict Content Security Policy blocks the page from loading anything from other sites.

## What "AI" means here

This app **doesn't call an AI model**. It does the maths and structure itself, then gives you a ready-to-paste prompt for the AI assistant you already use (ChatGPT, Claude, Gemini and so on). The prompt tells the assistant not to change your numbers.

## Run it yourself

No build step and no dependencies.

```bash
git clone https://github.com/joshuawayzwright/ai-quote-builder.git
cd ai-quote-builder
python3 -m http.server 8080   # then open http://localhost:8080
```

You can also just open `index.html` in a browser.

## Tests

```bash
npm test      # or: node --test "tests/*.test.js"
```

The tests cover the calculation logic in `lib.js`. CI runs them on every push and pull request.

## Files

| File | What it does |
|---|---|
| `index.html` | The page |
| `lib.js` | Calculations and text output (pure functions, tested) |
| `app.js` | Connects the form to `lib.js` |
| `style.css` | Styles, light and dark mode, print layout |
| `tests/` | Unit tests (Node's built-in test runner) |

## Licence

[MIT](LICENSE). Made by [Joshua Wright](https://github.com/joshuawayzwright) for [The Solo Service Provider](https://thesoloserviceprovider.com.au/), which has more toolkits for sole traders.

This is a planning aid, not legal, tax or financial advice.
