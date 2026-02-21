# Add this project to GitHub

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

After this, your code will be on GitHub. You can reconnect Vercel to the GitHub repo later for automatic deploys when you push.
