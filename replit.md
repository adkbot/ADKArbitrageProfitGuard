# ADK-Arbitragem System

## Overview

ADK-Arbitragem is a sophisticated cryptocurrency arbitrage trading system that detects and executes spot-futures arbitrage opportunities within the same exchange (e.g., Binance). The system filters trading entries using Wyckoff analysis and GEX/Gamma data from Deribit to reduce drawdown risk. It features automatic compound interest management on net profits per operation, real-time data visualization, and a comprehensive trading dashboard with advanced market analysis tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system following Material Design principles
- **Charts**: Chart.js for real-time data visualization (basis, funding rates, P&L, Wyckoff scores)
- **State Management**: TanStack React Query for server state management
- **Theme System**: Dark/light mode support with custom CSS variables

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL support (configured for Neon Database)
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple
- **Development**: Hot module replacement with Vite integration

### Trading Engine Components
- **Exchange Integration**: CCXT library for cryptocurrency exchange APIs (primarily Binance)
- **Market Analysis**: 
  - Wyckoff methodology implementation for market structure analysis
  - GEX/Gamma analysis using Deribit public API
  - Real-time basis tracking between spot and futures markets
- **Risk Management**: Configurable parameters for slippage, maximum notional amounts, and daily trade limits
- **Capital Management**: Automatic compound interest calculation on net trading profits

### Real-time Data Pipeline
- **Market Data**: Live streaming of spot and futures prices, funding rates
- **Analysis Updates**: Periodic refresh of Wyckoff scores and GEX data (configurable intervals)
- **Performance Tracking**: Real-time P&L calculations and trade execution monitoring

### Configuration Management
- **Environment Variables**: Comprehensive .env configuration for API credentials and trading parameters
- **UI Controls**: Modal-based configuration interface with validation
- **Default Values**: Pre-configured Deribit API credentials and sensible trading defaults

## External Dependencies

### Exchange APIs
- **Primary Exchange**: Binance (via CCXT) - spot and futures trading
- **Market Data Provider**: Deribit API (public endpoints) for options gamma exposure data
- **API Credentials**: Secure storage and management of exchange API keys

### Database Services
- **Primary Database**: Neon Database (PostgreSQL-compatible)
- **Connection**: @neondatabase/serverless driver for serverless deployment compatibility
- **Schema Management**: Drizzle Kit for database migrations and schema versioning

### Third-party Services
- **Font Delivery**: Google Fonts CDN (Inter, JetBrains Mono, Architects Daughter)
- **Development Tools**: Replit integration for development environment
- **UI Components**: Radix UI ecosystem for accessible component primitives

### Trading Infrastructure
- **Market Data**: Real-time cryptocurrency price feeds and order book data
- **Risk Analytics**: External market structure analysis tools and volatility indicators
- **Execution Layer**: Direct API integration with cryptocurrency exchanges for order placement