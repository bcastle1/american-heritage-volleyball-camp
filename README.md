# American Heritage Volleyball Camp

Static website for the American Heritage Volleyball Camp in American Fork, Utah. It is modeled after the Patriot Jiu-Jitsu landing-page structure, with volleyball-specific content, local generated volleyball imagery, TBD dates, and coach/camp details.

## What is included

- `index.html` - the full one-page website
- `styles.css` - responsive patriotic volleyball styling
- `script.js` - mobile menu and contact email draft behavior
- `assets/` - project-owned images and favicon
- `flyer.html` and `flyer.css` - print/share flyer matching the website theme
- `american-heritage-volleyball-camp-flyer.png` - rendered flyer image for sharing
- `.github/workflows/pages.yml` - GitHub Pages deployment workflow

## Local preview

Open `index.html` directly in a browser, or run a simple local server from this folder:

```powershell
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Recommended hosting path

GitHub Pages makes the most sense for this site because it is static, version-controlled, and easy to update by pushing changes.

1. Create a new GitHub repository, for example `american-heritage-volleyball-camp`.
2. Push this folder to the repository.
3. In GitHub, open Settings -> Pages and choose GitHub Actions as the Pages source.
4. Every push to `main` will publish the latest site.

If you want to use a Namecheap domain, point the domain DNS to the GitHub Pages site after the GitHub Pages URL is live. Add a `CNAME` file later if you decide on a custom domain.

## Contact form note

The current form creates an email draft and copies the message text. To collect submissions automatically, connect a real form endpoint or add the final coach/camp email recipient in `script.js`.
