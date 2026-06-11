# Patriots Volleyball Camp

Static website for the Patriots Volleyball / American Heritage Volleyball Camp in American Fork, Utah. It is modeled after the Patriot Jiu-Jitsu landing-page structure, with volleyball-specific content, local generated volleyball imagery, TBD dates, coach/camp details, Venmo checkout, and admin management.

Permanent host:

```text
https://patriotsvb.com/
```

## What is included

- `index.html` - the full one-page website
- `styles.css` - responsive patriotic volleyball styling
- `script.js` - mobile menu and contact email draft behavior
- `assets/` - project-owned images and favicon
- `flyer.html` and `flyer.css` - print/share flyer matching the website theme
- `admin.html`, `admin.css`, and `admin.js` - static admin dashboard opened from the bottom-right Admin link
- `american-heritage-volleyball-camp-flyer.png` - rendered flyer image for sharing
- `.github/workflows/pages.yml` - GitHub Pages deployment workflow

## Local preview

Open `index.html` directly in a browser, or run a simple local server from this folder:

```powershell
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Hosting and updates

GitHub Pages hosts the public site. Future Codex updates should be committed and pushed to:

```text
https://github.com/bcastle1/american-heritage-volleyball-camp
```

Every push to `main` publishes the latest site to `https://patriotsvb.com/`.

The `CNAME` file sets the GitHub Pages custom domain to `patriotsvb.com`. Namecheap DNS must point the apex domain to GitHub Pages and `www` to `bcastle1.github.io`.

## Data note

The static app stores registration/payment/admin records in the browser and supports CSV export plus CRM backup/restore. Do not commit private participant or payment data to this public repository. Use the admin export/backup flow or connect a backend for shared live data across devices.
