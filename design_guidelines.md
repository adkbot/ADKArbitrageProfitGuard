# Design Guidelines for ADK-Arbitragem System

## Design Approach
**Selected Approach**: Design System Approach (Material Design)
**Justification**: This is a data-heavy, utility-focused trading application where performance monitoring, real-time data visualization, and operational efficiency are paramount. Material Design provides excellent data visualization components and clear information hierarchy.

## Core Design Elements

### A. Color Palette
**Primary Colors**:
- Dark Mode Primary: 210 100% 85% (Light blue for trading interfaces)
- Light Mode Primary: 210 100% 45% (Professional blue)

**Accent Colors**:
- Success (Profit): 120 60% 50% (Green for positive values)
- Danger (Loss): 0 70% 50% (Red for negative values)
- Warning: 35 90% 55% (Orange for alerts)

**Background Colors**:
- Dark Mode: 220 15% 8% (Deep navy background)
- Light Mode: 0 0% 98% (Clean white background)

### B. Typography
**Font Stack**: Inter via Google Fonts CDN
- Headers: Inter 600 (Semi-bold)
- Body: Inter 400 (Regular)
- Data/Numbers: Inter 500 (Medium) with tabular-nums
- Monospace for code/IDs: 'JetBrains Mono'

### C. Layout System
**Spacing Units**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4 or p-6
- Section margins: m-6 or m-8
- Grid gaps: gap-4
- Button padding: px-6 py-2

### D. Component Library

**Navigation**:
- Top navigation bar with system status indicator
- Sidebar for different trading views
- Breadcrumb navigation for deep states

**Data Displays**:
- Real-time cards with metric values
- Data tables with sortable columns
- Live updating charts (basis, funding, PnL)
- Status badges with color coding

**Forms & Controls**:
- Configuration modal with tabbed sections
- Toggle switches for bot states
- Number inputs with validation
- Dropdown selects for exchange/pair selection

**Trading Interface**:
- Start/Pause/Stop action buttons
- Settings gear icon (⚙️) button
- Profit/loss indicators with trend arrows
- Real-time price tickers

**Overlays**:
- Configuration modal (large, centered)
- Alert notifications (top-right)
- Confirmation dialogs for critical actions

### E. Animations
**Minimal Approach**: 
- Subtle pulse animations for live data updates
- Smooth transitions for modal open/close (200ms)
- Loading spinners for API calls only
- No decorative animations to maintain trading focus

## Key Design Principles
1. **Data Clarity**: Numbers and metrics are the primary focus
2. **Real-time Awareness**: Clear visual indicators for live updates
3. **Risk Management**: Clear profit/loss visual hierarchy
4. **Professional Appearance**: Clean, trading-platform aesthetic
5. **Operational Efficiency**: Quick access to controls and status

## Dark Mode Implementation
Default to dark mode with consistent implementation across all components, especially form inputs and data displays, as this is standard for trading applications.