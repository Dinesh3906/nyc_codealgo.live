# Stripe Setup Guide for PermitIQ

Hello! To process payments and subscriptions securely on your application, we need to connect it to your own Stripe account. Please follow the instructions below to retrieve the necessary API keys. 

---

## Step 1: Create or Log in to Your Stripe Account
1. Go to [https://dashboard.stripe.com/](https://dashboard.stripe.com/register) and log in or create a new account for your business.
2. Complete your business profile setup if required.

## Step 2: Access Your API Keys
We will need two sets of keys: one for **Test Mode** (for us to safely test the payment flow) and one for **Live Mode** (for when you start charging real customers).

1. In your Stripe Dashboard, go to the top right of the screen and ensure the **Test Mode** toggle is switched **ON**.
2. From the home screen, click on the **Developers** button in the top right menu, then click on **API keys** in the left sidebar.
3. You will see two important keys under the "Standard keys" section:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...` - you may need to click "Reveal test key")
4. **Copy both of these keys.**

## Step 3: Setting Up Pricing (If Applicable)
If your application dictates recurring subscriptions or specific product prices, we will also need your **Price IDs**.

1. In your Stripe Dashboard, go to **Product Catalog** > **Products**.
2. Click **+ Add Product**.
3. Fill in the product details (e.g., "Pro Plan", "Enterprise Plan") and set the pricing (e.g., $49.00 / month).
4. Save the product.
5. In the product details page, scroll down to the "Pricing" section. You will see an API ID that looks like `price_1Pxxxxx...`.
6. **Copy the Price ID(s) for the plans we are integrating.**

## Step 4: Securely Send the Information
Please send us the following information. **Do NOT send Live Secret Keys over plain text email.**

**For Development / Testing:**
* Test Publishable Key (`pk_test_...`)
* Test Secret Key (`sk_test_...`)
* Test Price IDs (if you set up test products)

**For Production / Go-Live (Once Testing is complete):**
* Live Publishable Key (`pk_live_...`)
* Live Secret Key (`sk_live_...`) *(Please use a secure note sharing service like [pwpush.com](https://pwpush.com) or a secure messenger to share live secret keys!)*
* Live Price IDs (`price_...`)

---
**Why do we need this?**
- **Publishable Key**: Used by our website's frontend to securely tokenize credit card information directly with Stripe without it hitting our servers.
- **Secret Key**: Used safely by our backend to actually charge the card, manage subscriptions, and generate checkout sessions.
