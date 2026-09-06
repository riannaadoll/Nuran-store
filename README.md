# Nuran Collection

A lightweight e-commerce web app for a small women's clothing boutique, built as a Progressive Web App (PWA) with a real-time shared backend on Firebase.

**Live site:** https://nuran-collection.web.app

## Features

### Customer side
- Browse products by category, with size and color selection
- Shopping cart (persisted locally per device via IndexedDB)
- Checkout with delivery point selection and payment receipt upload
- Order history ("My Orders") scoped to the customer's own device
- Leave a review with a photo after an order is delivered
- Editable profile (name, phone, avatar photo)
- Light/Dark theme toggle
- Installable as a home-screen app (PWA) on Android and iOS

### Admin side
- Secure login via Firebase Authentication (email/password)
- Add, edit, and delete products (name, price, stock, sizes, colors, images, description)
- Manage product categories
- Live stock overview (total product types and total units)
- View and manage customer orders, update order status
- View uploaded payment receipts
- Manage payment card details shown to customers at checkout
- Telegram bot notification on every new order

## Tech stack

- **Frontend:** vanilla HTML, CSS, and JavaScript (no framework, no build step)
- **Backend:** [Firebase](https://firebase.google.com/)
  - **Firestore** — shared, real-time database for products, categories, orders, reviews, and settings
  - **Authentication** — email/password login for the admin panel
  - **Hosting** — production deployment
- **IndexedDB (Dexie.js)** — local shopping cart storage per device
- **Leaflet.js** — interactive map for delivery point selection
- **Telegram Bot API** — order notifications

## Project structure

```
.
├── index.html          # Markup for all pages/modals (customer + admin)
├── script.js            # App logic, Firebase integration, event handling
├── style.css             # Styling, responsive layout (mobile + desktop)
├── manifest.json        # PWA manifest (name, icons, theme color)
├── service-worker.js     # PWA service worker (basic caching)
└── images/               # Product placeholder images, icons, UI assets
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

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

## Security notes

- Firestore access is controlled via [Security Rules](https://firebase.google.com/docs/firestore/security/get-started): public read access for the catalog, write access restricted to authenticated admins.
- The Telegram bot token is currently included in client-side code for simplicity, matching the low-risk profile of a small single-store deployment (worst case: spam messages to the bot, no access to customer data or payment details). For a stronger setup, this call should be moved behind a Firebase Cloud Function.

## License

This project was built for private client use and is not licensed for redistribution.