# PermitIQ by Aureon — 100% Free Hosting Stack ($0/Month)

This guide shows you how to host the complete PermitIQ platform without paying anything.

---

## 1. The $0/Month Architecture

| Component | Free Provider | Free Tier Limits | Cost |
|---|---|---|---|
| **Backend API** | **Render (Free Tier)** | 512 MB RAM, 0.1 CPU, auto-sleep after 15m idle | **$0 / mo** |
| **Frontend Web** | **Render (Free Tier)** or **Vercel (Hobby)** | Unlimited builds, global CDN, auto-SSL | **$0 / mo** |
| **Database** | **TiDB Cloud (Serverless)** | 5 GB storage, 50 Million Request Units / mo | **$0 / mo** |
| **Vector DB** | **Pinecone (Starter)** | 1 free index, up to 100,000 vectors | **$0 / mo** |
| **AI LLM** | **Google AI Studio (Gemini 2.5/Flash)** | Free tier rate limits (15 RPM, 1M TPM) | **$0 / mo** |
| **SSL / HTTPS** | **Let's Encrypt** (via Render/Vercel) | Automatic issuance and renewals | **$0 / mo** |
| **Keep-Alive** | **UptimeRobot / Cron-job.org** | Free HTTP ping every 10 mins (prevents cold starts) | **$0 / mo** |
| **TOTAL COST** | | | **$0.00 / mo** |

---

## 2. Blueprint Configuration (`render.yaml`)

Your repository includes [render.yaml](file:///d:/nyc_algo/render.yaml) preconfigured for the **free** tier (`plan: free` on both services with no paid attached disks).

### Services Configured:
1. **`permitiq-api` (Backend):**
   * Plan: `free`
   * Health Check: `/health`
   * Ephemeral upload storage in `/app/uploads`
2. **`permitiq-web` (Frontend):**
   * Plan: `free`
   * Node 20 / Next.js 15

---

## 3. Step-by-Step 1-Click Setup on Render

### Step 1: Push Code to GitHub
Run the deployment script from your terminal:
```powershell
.\deploy_render.ps1 -CommitMessage "deploy: configure 100% free tier"
```

### Step 2: Open Render Dashboard
1. Go to **[dashboard.render.com](https://dashboard.render.com)** (sign up with GitHub if you haven't).
2. Click **New +** > **Blueprint**.
3. Select your repository: `Dinesh3906/nyc_codealgo.live`.
4. Render will inspect [render.yaml](file:///d:/nyc_algo/render.yaml) and show the free tier setup.

### Step 3: Enter Free API Keys
Render will prompt for your environment keys:
* **`DATABASE_URL`**: Your TiDB Cloud Serverless connection string (`mysql://user:pass@gateway.tidbcloud.com:4000/nyc_algo?ssl={"minVersion":"TLSv1.2"}`).
* **`GOOGLE_AI_STUDIO_KEY`**: Free key from [aistudio.google.com](https://aistudio.google.com).
* **`PINECONE_API_KEY`**: Free key from [pinecone.io](https://www.pinecone.io).
* **`GROQ_API_KEY`**: Free key from [console.groq.com](https://console.groq.com).
* **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`**: Free from Google Cloud Console.
* **`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`**: From Razorpay dashboard.

### Step 4: Click "Apply"
Render will build and deploy both services at **$0 cost**.

---

## 4. How to Prevent Cold Starts on Render Free Tier (Free Trick)

Render's free tier spins down web services after 15 minutes of inactivity. When a user visits, the service takes ~30 seconds to wake up.

**How to keep it awake 24/7 for free:**
1. Go to **[UptimeRobot.com](https://uptimerobot.com)** (or **[cron-job.org](https://cron-job.org)**) and create a free account.
2. Add a **New Monitor**:
   * **Monitor Type:** `HTTP(s)`
   * **Friendly Name:** `PermitIQ Backend KeepAlive`
   * **URL:** `https://permitiq-api.onrender.com/health`
   * **Monitoring Interval:** `Every 10 minutes`
3. Save the monitor. UptimeRobot will ping the healthcheck endpoint every 10 minutes, keeping your Render free service active 24/7 with **zero cold starts**.

---

## 5. Free Database Setup (TiDB Cloud Serverless)

If you don't have a free database yet:
1. Go to **[tidbcloud.com](https://tidbcloud.com)** and sign up (no credit card required).
2. Click **Create Cluster** > Select **Serverless (Free Forever)**.
3. Choose the region nearest to your Render service (e.g., AWS Oregon `us-west-2` or Tokyo `ap-northeast-1`).
4. Click **Connect** > copy the connection string or credentials.
5. In your local repository, run the migration script:
   ```bash
   cd backend
   npx tsx scripts/migrate_to_tidb.ts
   ```
   This creates all required tables (`user`, `plan`, `feedback`, `leads`, etc.).
6. Paste the connection string into Render's `DATABASE_URL` variable.
