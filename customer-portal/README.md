# Smartifly OTT - Customer Portal

A modern, premium customer portal website for the Smartifly OTT Platform. This is a business & support portal (not a streaming app) that allows customers to view subscription packages, create support tickets, contact the business, and check subscription status.

## Features

- 🎨 Premium dark-themed UI with glassmorphism effects
- 📦 Subscription packages display
- 🎫 Support ticket creation and tracking
- 📧 Contact form
- 📊 Subscription status lookup
- 📢 Announcements banner
- 📱 Fully responsive design
- ⚡ Built with Next.js 14 App Router

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Fetch API
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
customer-portal/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Landing page
│   │   ├── packages/     # Packages page
│   │   ├── contact/      # Contact page
│   │   ├── tickets/      # Ticket pages
│   │   ├── subscription/ # Subscription page
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   │   ├── layout/       # Navbar, Footer
│   │   └── ui/           # Reusable UI components
│   ├── lib/              # Utilities
│   │   └── api.ts        # API client
│   └── types/            # TypeScript types
├── public/               # Static assets
└── package.json
```

## Routes

- `/` - Landing page
- `/packages` - Subscription packages
- `/contact` - Contact form
- `/tickets/create` - Create support ticket
- `/tickets/[id]` - View ticket details
- `/subscription` - Subscription status lookup
- `/privacy` - Privacy policy
- `/terms` - Terms of service

## API Integration

The portal consumes APIs from the backend. Set the `NEXT_PUBLIC_API_URL` environment variable to point to your backend API.

### Available Endpoints

- `GET /api/packages` - Get subscription packages
- `POST /api/tickets` - Create a support ticket
- `GET /api/tickets/:id` - Get ticket details
- `GET /api/announcements` - Get active announcements
- `GET /api/settings` - Get site settings

## Design System

The design system uses CSS variables defined in `globals.css`:

- Background colors: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, etc.
- Text colors: `--text-primary`, `--text-secondary`
- Accent colors: Violet (`#8B5CF6`) and Cyan (`#06B6D4`)
- Glassmorphism effects with backdrop blur
- Neon glow effects on primary CTAs

## Building for Production

```bash
npm run build
npm start
```

## License

Private - Smartifly OTT Platform


