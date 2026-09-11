# Nuran Collection

A lightweight e-commerce web app for a small women's clothing boutique in Tashkent, built as a Progressive Web App (PWA) with a real-time shared backend on Firebase.

**Live site:** https://nuran-collection.web.app

## Features

### Customer side

- Browse products by category, with size and color selection, discount pricing, and a fuzzy search that matches across Latin/Cyrillic spelling
- Shopping cart (persisted locally per device via IndexedDB)
- Checkout with two delivery options:
  - **BTS Pochta** — pick a delivery point by region, or select one directly from an interactive map
  - **Yandex Go** (Tashkent city only) — opens the Yandex Go app with the pickup point pre-filled to the store's location; the customer enters their own drop-off address and pays the courier directly
- Payment by card transfer with receipt/screenshot upload
- Order history ("My Orders") scoped to the customer's own device, with live status updates
- Request an order cancellation (with a reason), track its approval/rejection, and get notified in-app once resolved
- Leave a star-rated review with an optional photo after an order is delivered; reviews are shown on each product's page
- Editable profile (name, phone, avatar photo)
- Light/Dark theme toggle
- "About us" info (address, phone, email, license, contract) shown in the footer and in the profile screen
- Installable as a home-screen app (PWA) on Android and iOS

### Admin side

- Secure login via Firebase Authentication (email/password)
- Add, edit, and delete products (name, price, discount, stock, sizes, colors, images, description)
- Manage product categories
- **Inventory dashboard**: total product types/units, per-category breakdown (initial stock, sold, remaining, and their monetary value), plus a monthly/yearly sales trend line chart per category
- **Receipts panel**: review uploaded payment screenshots, update order status (Pending / Shipped / Cancelled), manually delete records for cancelled orders
- **Cancellation requests panel**: approve or reject customer cancellation requests; approving prompts for a refund receipt upload
- **Debt tracking (CRM)**: manually log in-store customers who took goods on credit — amount, items, due date; a dedicated "due today" table; call/partial-payment/extend-deadline actions per debtor; automatic color-coded urgency (10 days / 5 days / due today / overdue)
- **Company settings**: edit the store's public info (founded year, address, phone, email, license, contract) and pin the store's exact location on a map (used for the Yandex Go pickup point)
- Manage payment card details shown to customers at checkout
- Red notification badges (desktop header, mobile bottom nav, and profile menu) for new receipts, new cancellation requests, and debts needing attention
- Telegram bot notification on every new order

## Tech stack

- **Frontend:** vanilla HTML, CSS, and JavaScript (no framework, no build step)
- **Backend:** [Firebase](https://firebase.google.com/)
  - **Firestore** — shared, real-time database for products, categories, orders, reviews, debts, and settings
  - **Authentication** — email/password login for the admin panel
  - **Hosting** — production deployment
  - **Cloud Functions** *(optional, requires the Blaze plan)* — scheduled daily debt-reminder notifications to Telegram; see `functions/`
- **IndexedDB (Dexie.js)** — local shopping cart storage per device
- **Leaflet.js** — interactive maps for BTS delivery point and store location selection
- **Chart.js** — sales trend charts in the inventory dashboard
- **Telegram Bot API** — order notifications

## Project structure

```
.
├── index.html           # Markup for all pages/modals (customer + admin)
├── script.js             # App logic, Firebase integration, event handling
├── style.css              # Styling, responsive layout (mobile + desktop)
├── manifest.json         # PWA manifest (name, icons, theme color)
├── service-worker.js      # PWA service worker (basic caching)
├── images/                # Product placeholder images, icons, UI assets
└── functions/             # Optional Cloud Function: daily debt-reminder Telegram alerts
    ├── index.js
    └── package.json
```

## Local development

This is a static site with no build step. To run it locally:

1. Clone the repository.
2. Open the folder in VS Code.
3. Install the **Live Server** extension.
4. Right-click `index.html` → "Open with Live Server".

The app connects to a live Firebase project, so product/order data is shared with the production site even in local development.

## Deployment

Deployment is handled via the Firebase CLI:

```
npm install -g firebase-tools
firebase login
firebase deploy
```

### Optional: automated debt reminders

The `functions/` folder contains a Cloud Function that runs daily and sends the admin a Telegram message when a debt is 10, 5, or 0 days from its due date, or 15 days overdue. It requires the Firebase **Blaze** (pay-as-you-go) plan. See the comment block at the top of `functions/index.js` for full setup instructions. This is optional — the in-app debt tracker and its notification badges work fully without it.

## Security notes

- Firestore access is controlled via [Security Rules](https://firebase.google.com/docs/firestore/security/get-started): public read access for the catalog, tightly scoped public write access for cart checkout and order-related customer actions (cancellation requests, status acknowledgements), and full write access restricted to authenticated admins.
- The Telegram bot token is currently included in client-side code for simplicity, matching the low-risk profile of a small single-store deployment (worst case: spam messages to the bot, no access to customer data or payment details). For a stronger setup, this call should be moved behind a Firebase Cloud Function.

## License

This project was built for private client use and is not licensed for redistribution.