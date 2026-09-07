# Saved Reels Shuffle

A static site for your Instagram `saved_posts.json` export. Upload the file in the browser, shuffle the list, and scroll item by item.

The official export does **not** include video files. It includes the Instagram URL, caption, account, hashtags, and save time. This page embeds Instagram’s public player for each link.

Nothing is uploaded to a server. The JSON stays in your browser tab.

## Host on GitHub Pages

1. Create a new GitHub repository.
2. Upload these files to the repo root (or a `docs` folder):
   - `index.html`
   - `styles.css`
   - `app.js`
3. In the repo: **Settings → Pages**.
4. Set source to **Deploy from a branch**, branch `main`, folder `/` (or `/docs` if you used that).
5. Open the Pages URL GitHub shows you.

You can also open `index.html` directly on your computer. Some embeds work better over https, so Pages is nicer.

## Get the JSON from Instagram

1. Instagram app or website → Accounts Center → Your information and permissions → Download your information.
2. Choose **some of your information** → **Saved**.
3. Format: **JSON**.
4. Download the zip when it is ready and find `saved_posts.json`.

This project was tested with the 2026-style export:

```json
[
  {
    "timestamp": 1788756559,
    "media": [],
    "label_values": [
      { "label": "URL", "value": "https://www.instagram.com/reel/..../" },
      { "label": "Caption", "value": "..." },
      { "title": "Owner", "dict": [ { "dict": [
        { "label": "Name", "value": "..." },
        { "label": "Username", "value": "..." }
      ] } ] }
    ]
  }
]
```

Older exports that wrap the list in an object are also accepted.

## Controls

- ▼ / ▲ or swipe or `j` / `k` / arrow keys: next and previous
- Space: next
- `r` or Shuffle: new random order
- Reels only: hide regular posts
- Search box: username, caption, or hashtag

Instagram may show a login prompt or a preview instead of autoplay. That is Instagram’s embed, not this page.
