import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

const fontFamily = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

const commonTypography = {
  fontFamily,
  h1: { fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-0.02em' },
  h2: { fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.01em' },
  h3: { fontWeight: 800, fontSize: '1.75rem' },
  h4: { fontWeight: 800, fontSize: '1.5rem' }, // 24px Titles
  h5: { fontWeight: 700, fontSize: '1.25rem' },
  h6: { fontWeight: 700, fontSize: '1.125rem' },
  subtitle1: { fontWeight: 700, fontSize: '1rem' },
  subtitle2: { fontWeight: 700, fontSize: '0.9375rem' },
  body1: { fontSize: '1rem', lineHeight: 1.5 }, // 16px Minimum Body Text
  body2: { fontSize: '0.9375rem', lineHeight: 1.45 },
  button: { textTransform: 'none' as const, fontWeight: 800, fontSize: '1.125rem' }, // 18px Buttons
};

const commonComponents: ThemeOptions['components'] = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        minHeight: 48, // 48px Minimum Button Height for accessibility & Cash Register usability
        padding: '10px 20px',
        fontWeight: 800,
        fontSize: '1.125rem', // 18px Button Text
        boxShadow: 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
          transform: 'translateY(-1px)',
        },
        '&.MuiButton-containedPrimary': {
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#1D4ED8',
          },
        },
        '&.MuiButton-containedSuccess': {
          backgroundColor: '#16A34A',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#15803D',
          },
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        borderRadius: 16,
        border: '1px solid #E2E8F0',
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
      },
      elevation1: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      elevation2: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
      },
      elevation3: {
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        padding: '16px 20px', // High rows & ample spacing for legibility
        fontSize: '1rem', // 16px body in tables
      },
      head: {
        fontWeight: 800,
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontSize: '1rem',
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:nth-of-type(even)': {
          backgroundColor: '#FAFAFA', // Alternating row backgrounds
        },
        '&:hover': {
          backgroundColor: '#F1F5F9 !important', // Soft hover
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        fontSize: '1rem', // 16px input font
        minHeight: 48,
        backgroundColor: '#FFFFFF',
        '& fieldset': {
          borderWidth: '1px !important',
          borderColor: '#CBD5E1',
        },
        '&:hover fieldset': {
          borderColor: '#2563EB',
        },
      },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#475569',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 800,
        fontSize: '0.875rem',
        height: 32,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 800,
        minHeight: 48,
        fontSize: '1rem',
        borderRadius: 10,
        padding: '8px 20px',
        marginRight: 6,
      },
    },
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#FFFFFF', // Pure White
      paper: '#FFFFFF',   // Pure White
    },
    primary: {
      main: '#2563EB', // Blue 600
      light: '#3B82F6',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#16A34A', // Green 600
      light: '#22C55E',
      dark: '#15803D',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#DC2626', // Red 600
    },
    warning: {
      main: '#D97706', // Orange 600
    },
    info: {
      main: '#2563EB', // Blue 600
    },
    success: {
      main: '#16A34A', // Green 600
    },
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#475569', // Slate 600
    },
    divider: '#E2E8F0', // Slate 200
  },
  typography: commonTypography,
  shape: { borderRadius: 14 },
  components: commonComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0F172A',
      paper: '#1E293B',
    },
    primary: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#22C55E',
      light: '#4ADE80',
      dark: '#16A34A',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444',
    },
    warning: {
      main: '#F59E0B',
    },
    info: {
      main: '#3B82F6',
    },
    success: {
      main: '#22C55E',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    divider: '#334155',
  },
  typography: commonTypography,
  shape: { borderRadius: 14 },
  components: commonComponents,
});
