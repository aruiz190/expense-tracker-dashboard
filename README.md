# Expense Tracker Dashboard

Modern expense dashboard built with **Next.js 14 (App Router)**, **Firebase Auth + Firestore**, and **Chart.js**.

## Features
- Google sign-in (Firebase Auth)
- Per-user data in Firestore with **security rules**
- Add income & expenses with categories and notes
- Monthly net, income/expense cards
- Category bar chart + income/expense pie
- Clean dark UI

## Run locally
```bash
npm install
cp .env.example .env.local  # then fill your Firebase web config
npm run dev
