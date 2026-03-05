# Student Performance Predictor Frontend

React TypeScript application with Material-UI and Framer Motion.

## 🚀 Technologies

- **React 19** with **TypeScript**
- **Material-UI (MUI)** - Modern UI components
- **Framer Motion** - Smooth animations
- **Vite** - Fast build tool

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Install Dependencies

```bash
cd frontend
npm install
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

Or use the batch file:
```bash
start.bat
```

The application will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Sidebar.tsx         # Student sidebar navigation
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Application entry point
│   └── vite-env.d.ts          # Vite type definitions
├── index.html
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── package.json
└── README.md
```

## 🎨 Features

### Student Sidebar Navigation

- **Dashboard** - Overview of student performance
- **Performance Analytics** - Detailed analytics and charts
- **Personalized Study Plan** - AI-powered study recommendations
- **Assignments & Grades** - Track assignments and grades
- **Chatbot Support** - AI assistant for help
- **Notifications** - Important updates and alerts
- **Profile & Settings** - Manage account settings
- **Logout** - Sign out of the application

## 🎯 Key Features

- ✅ Fully responsive sidebar with gradient design
- ✅ Smooth animations using Framer Motion
- ✅ Material-UI components for modern UI
- ✅ TypeScript for type safety
- ✅ Fast development with Vite HMR

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🎨 Customization

### Theme Colors

Edit `src/main.tsx` to customize the theme:

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1', // Indigo
    },
    secondary: {
      main: '#ec4899', // Pink
    },
  },
})
```

### Sidebar Items

Edit `src/components/Sidebar.tsx` to add/remove menu items:

```typescript
const menuItems: MenuItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon /> },
  // Add your items here
]
```

## 🔧 Dependencies

### Core Dependencies
- `react` - ^19.2.0
- `react-dom` - ^19.2.0
- `@mui/material` - ^7.3.4
- `@mui/icons-material` - ^7.3.4
- `@emotion/react` - ^11.14.0
- `@emotion/styled` - ^11.14.1
- `framer-motion` - ^12.23.24

### Dev Dependencies
- `typescript` - ^5.9.3
- `vite` - ^7.1.12
- `@vitejs/plugin-react` - ^5.1.0
- `@types/react` - ^19.2.2
- `@types/react-dom` - ^19.2.2

## 📄 License

ISC

