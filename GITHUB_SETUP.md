# GitHub & Vercel deployment

## Fix: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" on Vercel

This error appears on **Vercel** because `.env.local` is not used in production. Set these in the Vercel project:

1. **Vercel Dashboard** → your project → **Settings** → **Environment Variables**
2. Add (use the same values as in your local `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
3. Apply to **Production**, **Preview**, and **Development** as needed, then **Save**
4. **Redeploy**: Deployments → latest → **Redeploy** (or push a new commit)

After redeploy, the app will work at your domain (e.g. https://www.dentraflow.com).

---

## Add this project to GitHub

The project is no longer linked to Vercel and is ready to push to GitHub.

## 1. Create a new repository on GitHub

1. Go to **https://github.com/new**
2. **Repository name:** `dentraflow` (or `Dentraflow`)
3. **Description:** (optional) e.g. "AI front desk for dental clinics"
4. Choose **Public**
5. **Do not** check "Add a README" or ".gitignore" (this repo already has code)
6. Click **Create repository**

## 2. Push your code from this folder

In PowerShell or Terminal, from the `Dentraflow` folder, run (replace `YOUR_USERNAME` with your GitHub username):

```powershell
cd c:\Dentraflow
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dentraflow.git
git push -u origin main
```

If your branch is already named `main`, you can skip the `git branch -M main` line.

If you use SSH instead:

```powershell
git remote add origin git@github.com:YOUR_USERNAME/dentraflow.git
git push -u origin main
```

After this, your code will be on GitHub. You can reconnect Vercel to the GitHub repo for automatic deploys when you push.

## 3. Custom domain (e.g. www.dentraflow.com)

1. **Vercel Dashboard** → your project → **Settings** → **Domains**
2. Add `www.dentraflow.com` (and optionally `dentraflow.com` for redirect)
3. Follow Vercel’s DNS instructions (CNAME or A record) at your domain registrar
4. Once DNS is set, Vercel will serve the app and handle www redirects
