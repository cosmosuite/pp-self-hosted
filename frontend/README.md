# PP Self Hosted Frontend

A modern React application built with TypeScript and shadcn/ui.

## Features

- ⚡️ **Vite** - Fast build tool and dev server
- ⚛️ **React 18** - Latest React with concurrent features
- 🔷 **TypeScript** - Type-safe JavaScript
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🧩 **shadcn/ui** - Beautiful, accessible UI components
- 📦 **ESLint** - Code linting and formatting

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The app will be available at `http://localhost:5173` when running the dev server.

## Project Structure

```
src/
├── components/
│   └── ui/          # shadcn/ui components
├── lib/
│   └── utils.ts     # Utility functions
├── App.tsx          # Main app component
├── main.tsx         # App entry point
└── index.css        # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Adding shadcn/ui Components

To add more shadcn/ui components, you can use the shadcn/ui CLI:

```bash
npx shadcn-ui@latest add [component-name]
```

Or manually add components to the `src/components/ui/` directory following the shadcn/ui patterns.
