# Tokyo LLC Static Website

A simple one-page static website for Tokyo LLC.

## Files

- `index.html` — one-page website
- `styles.css` — responsive design and layout
- `script.js` — mobile menu and mailto contact form
- `assets/logo-transparent.png` — main logo
- `assets/client-logos/` — place the 8 client logos here

## What to edit before publishing

In `index.html`, replace these placeholders:

- Phone: `(555) 555-5555`
- Email: `contact@tokyollc.com`
- WhatsApp/live chat link: `https://wa.me/15555555555`
- Client logo placeholders in the `Clients & Partners` section

## Adding client logos

Place the 8 client logos in:

```text
assets/client-logos/
```

Example filenames:

```text
client-1.png
client-2.png
client-3.png
client-4.png
client-5.png
client-6.png
client-7.png
client-8.png
```

Then replace each placeholder:

```html
<div class="client-logo"><span>Client Logo 1</span></div>
```

with:

```html
<div class="client-logo"><img src="assets/client-logos/client-1.png" alt="Client name logo"></div>
```

## Contact form note

The form currently opens an email draft using `mailto:` because this is a static website. For a real form submission without opening the user's email app, connect it to Formspree, Netlify Forms, Cloudflare Workers, or another backend.

## Live chat note

The live chat button currently uses a WhatsApp link. Replace `15555555555` with the real business phone number in international format.
