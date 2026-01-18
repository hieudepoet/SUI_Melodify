# Sui Greeting DApp - Frontend

Modern, scalable React frontend for Sui blockchain greeting application.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx
│   ├── GreetingForm.tsx
│   ├── GreetingList.tsx
│   ├── WalletStatus.tsx
│   └── index.ts
├── hooks/              # Custom React hooks
│   └── useGreetings.ts
├── providers/          # Context providers
│   └── SuiProvider.tsx
├── config/             # Configuration & constants
│   └── index.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
├── App.tsx             # Main app component
└── main.tsx            # App entry point
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update:
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUI_NETWORK=testnet
VITE_PACKAGE_ID=0xYOUR_PACKAGE_ID
VITE_APP_NAME=Sui Greeting DApp
```

### 3. Deploy Move Contract
```bash
cd ../move/hello-world
sui move build
sui client publish --gas-budget 20000000
```

### 4. Update Package ID
Copy the Package ID from deployment output and update `.env`

### 5. Run Development Server
```bash
npm run dev
```

## 🏗️ Architecture

### Component-Based Design
- **Separation of Concerns**: Each component has a single responsibility
- **Reusability**: Components can be easily reused and composed
- **Testability**: Isolated components are easier to test

### Custom Hooks
- `useGreetings`: Manages greeting state and blockchain interactions
- Encapsulates business logic away from UI components

### Configuration Management
- Environment variables for different deployment environments
- Centralized config file for easy maintenance

### Type Safety
- Full TypeScript support
- Defined interfaces for all data structures

## 🔧 Configuration

### Environment Variables
- `VITE_SUI_NETWORK`: Sui network (mainnet/testnet/devnet/localnet)
- `VITE_PACKAGE_ID`: Deployed Move package ID
- `VITE_APP_NAME`: Application name

### Network Configuration
Change network in `.env`:
```env
VITE_SUI_NETWORK=mainnet  # or testnet, devnet, localnet
```

## 📦 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **@mysten/dapp-kit** - Sui wallet integration
- **@mysten/sui** - Sui SDK
- **Radix UI** - Component library
- **TanStack Query** - Data fetching & caching

## 🎨 Components

### Header
Displays app name and wallet connect button

### GreetingForm
Form to create local or on-chain greetings

### GreetingList
Displays list of local greetings with timestamps

### WalletStatus
Shows wallet connection status and network info

## 🔌 Hooks

### useGreetings
```typescript
const {
  greetings,      // Array of greetings
  isLoading,      // Loading state
  error,          // Error message
  account,        // Connected wallet account
  addLocalGreeting,      // Add local greeting
  createOnChainGreeting  // Create on-chain greeting
} = useGreetings()
```

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📝 Best Practices Applied

✅ **Component Architecture** - Modular, reusable components  
✅ **Custom Hooks** - Business logic separation  
✅ **Environment Variables** - Configuration management  
✅ **TypeScript** - Type safety throughout  
✅ **Clean Code** - Readable, maintainable code  
✅ **Scalability** - Easy to add new features  
✅ **Migration Ready** - Well-organized for future changes  

## 🔄 Adding New Features

### Add New Component
1. Create component in `src/components/`
2. Export from `src/components/index.ts`
3. Import and use in parent component

### Add New Hook
1. Create hook in `src/hooks/`
2. Follow naming convention: `use[Name].ts`
3. Export hook logic

### Add New Configuration
1. Add to `.env` with `VITE_` prefix
2. Import in `src/config/index.ts`
3. Use via config object

## 🐛 Troubleshooting

**Wallet not connecting?**
- Install Sui Wallet browser extension
- Check network configuration

**Transaction failing?**
- Verify Package ID in `.env`
- Ensure sufficient testnet SUI tokens
- Check network matches deployment

**Build errors?**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite`
