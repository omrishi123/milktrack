# Milk Tracker Pro

A professional, AI-powered application for managing milk delivery records, generating professional invoices, and tracking customer payments.

## Features
- **Customer Management**: Easily add and manage your client list.
- **Daily Entries**: Record morning and evening deliveries with custom pricing.
- **Professional Billing**: Generate high-quality PDF invoices with dynamic UPI QR codes for instant payments.
- **WhatsApp Integration**: Share itemized text summaries or PDF bills directly to customer chats.
- **AI Insights**: Intelligent analysis of consumption trends and payment health using Gemini.
- **Data Portability**: Full JSON export and import for local backups.

## Deployment Guide (Vercel)

1. **Push to GitHub**: Upload your project code to a GitHub repository.
2. **Connect to Vercel**: Import the repository into a new Vercel project.
3. **Environment Variables**:
   In the Vercel dashboard, navigate to **Settings > Environment Variables** and add:
   - `GOOGLE_GENAI_API_KEY`: Your API key from [Google AI Studio](https://aistudio.google.com/).
4. **Build & Deploy**: Vercel will automatically run `npm run build` and deploy your app.

## Firebase Setup
This app uses Firebase Firestore for data and Firebase Authentication for user accounts. The configuration is located in `src/firebase/config.ts`. Ensure your Security Rules in `firestore.rules` are deployed to protect user data.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database/Auth**: Firebase
- **AI**: Genkit (Gemini 2.5 Flash)
- **UI**: ShadCN UI + Tailwind CSS
- **Utilities**: html2canvas, jspdf (for PDF generation), qrcode.react (for UPI QR codes)
# milktrack
