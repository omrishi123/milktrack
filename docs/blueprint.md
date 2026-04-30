# **App Name**: Milk Tracker Pro

## Core Features:

- User Authentication: Securely register and log in to the application using email/password or Google Sign-in. All user data is private and tied to the authenticated account using Firebase Authentication.
- Cloud Data Storage: All customer, milk entry, and settings data is securely stored and synchronized in the cloud using Firebase Firestore, ensuring data persistence and accessibility across devices for the authenticated user.
- Customer Management: Add new customers, view a list of all customers, and manage their details. Customer data is stored in Firebase and tied to the logged-in user.
- Daily Milk Entry: Record daily milk entries for each customer, specifying date, time of day (morning/evening), milk quantity, and price per liter. Entries are saved to Firebase Firestore.
- Payment Tracking: Efficiently mark outstanding milk entries as 'paid' for specific date ranges per customer. Payment status is updated in Firebase Firestore.
- History & Reporting: View a detailed history of milk entries, with options to search by date, filter by payment status (paid/unpaid), or filter by month. Individual entries can be edited or deleted directly in Firebase. Data is visualized with an interactive chart.
- Settings Management: Configure application settings, including the business name for invoices, a default price per liter, and a dark mode toggle for UI preferences. Settings are saved to Firebase Firestore.
- Data Export & Print: Export customer-specific reports as CSV files for external analysis or generate printable invoices/summary reports for record-keeping. The system also supports full data backup to JSON and import functionality for disaster recovery (note: file operations may depend on native app integration).
- Intelligent Customer Insights: An AI-powered tool that summarizes a customer's milk consumption and payment patterns, highlighting potential trends or overdue payments to inform business decisions based on cloud-stored data.

## Style Guidelines:

- Primary color: A vibrant blue (#0D6EFD) for headings, primary buttons, and key interactive elements, reflecting a professional and clear aesthetic.
- Background color: A soft light gray (#F4F7FC) for the main application background, providing a clean and calm canvas. Card backgrounds are pure white (#FFFFFF).
- Accent colors: Success actions use green (#198754), danger actions use red (#DC3545), and warnings/secondary actions use yellow (#FFC107) and gray (#6C757D).
- Dark mode support with a palette shift to darker tones (e.g., #121212 background, #1e1e1e card background, #90caf9 heading color) for reduced eye strain in low-light environments.
- Font family: A modern, system-default sans-serif stack (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif) for high legibility and native feel across devices.
- Utilize simple, outline-style SVG icons for system actions (e.g., settings) and clear, universally understood emojis (✏️, 🗑️) for inline actions like editing and deleting entries.
- A responsive, grid-based layout contained within a maximum width of 1000px, ensuring optimal organization and readability. Content is grouped into distinct 'card' components with generous padding and subtle shadows.
- Subtle and smooth UI transitions for background color changes, text updates, and button interactions (0.2s-0.3s ease) to provide fluid visual feedback.