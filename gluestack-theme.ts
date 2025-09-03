import { createConfig } from '@gluestack-style/react';
import { config as baseConfig } from '@gluestack-ui/config';

const gray = {
  50: '#F8F9FA',
  100: '#E9ECEF',
  200: '#DEE2E6',
  300: '#CED4DA',
  400: '#ADB5BD',
  500: '#6C757D',
  600: '#495057',
  700: '#343A40',
  800: '#212529',
};

export const theme = createConfig({
  ...baseConfig,
  tokens: {
    ...baseConfig.tokens,
    colors: {
      ...baseConfig.tokens.colors,
      // Override default colors with our grayscale palette
      primary0: gray[800],
      primary50: gray[50],
      primary100: gray[100],
      primary200: gray[200],
      primary300: gray[300],
      primary400: gray[400],
      primary500: gray[500],
      primary600: gray[600],
      primary700: gray[700],
      primary800: gray[800],
      primary900: gray[800],
      primary950: gray[800],
      
      // Background colors
      backgroundLight0: gray[50],
      backgroundLight50: gray[50],
      backgroundLight100: gray[100],
      backgroundLight200: gray[200],
      backgroundLight300: gray[300],
      backgroundLight400: gray[400],
      backgroundLight500: gray[500],
      backgroundLight600: gray[600],
      backgroundLight700: gray[700],
      backgroundLight800: gray[800],
      backgroundLight900: gray[800],
      backgroundLight950: gray[800],

      backgroundDark0: gray[800],
      backgroundDark50: gray[700],
      backgroundDark100: gray[600],
      backgroundDark200: gray[500],
      backgroundDark300: gray[400],
      backgroundDark400: gray[300],
      backgroundDark500: gray[200],
      backgroundDark600: gray[100],
      backgroundDark700: gray[50],
      backgroundDark800: gray[50],
      backgroundDark900: gray[50],
      backgroundDark950: gray[50],

      // Text colors
      textLight0: gray[800],
      textLight50: gray[800],
      textLight100: gray[700],
      textLight200: gray[600],
      textLight300: gray[500],
      textLight400: gray[400],
      textLight500: gray[300],
      textLight600: gray[200],
      textLight700: gray[100],
      textLight800: gray[50],
      textLight900: gray[50],
      textLight950: gray[50],

      textDark0: gray[50],
      textDark50: gray[50],
      textDark100: gray[100],
      textDark200: gray[200],
      textDark300: gray[300],
      textDark400: gray[400],
      textDark500: gray[500],
      textDark600: gray[600],
      textDark700: gray[700],
      textDark800: gray[800],
      textDark900: gray[800],
      textDark950: gray[800],

      // Border colors
      borderLight0: gray[200],
      borderLight50: gray[200],
      borderLight100: gray[200],
      borderLight200: gray[300],
      borderLight300: gray[400],

      borderDark0: gray[600],
      borderDark50: gray[600],
      borderDark100: gray[600],
      borderDark200: gray[500],
      borderDark300: gray[400],

      // Card colors
      cardLight: '#FFFFFF',
      cardDark: gray[700],

      // Custom semantic colors
      surface: {
        light: gray[50],
        dark: gray[800],
      },
      card: {
        light: '#FFFFFF',
        dark: gray[700],
      },
      border: {
        light: gray[200],
        dark: gray[600],
      },
      text: {
        primary: {
          light: gray[800],
          dark: gray[50],
        },
        secondary: {
          light: gray[600],
          dark: gray[300],
        },
        muted: {
          light: gray[500],
          dark: gray[400],
        },
      },
      accent: {
        light: gray[800],
        dark: gray[100],
      },
    },
    space: {
      ...baseConfig.tokens.space,
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      '2xl': 48,
      '3xl': 64,
    },
    radii: {
      ...baseConfig.tokens.radii,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      card: 12,
      button: 8,
    },
    fontSizes: {
      ...baseConfig.tokens.fontSizes,
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },
    lineHeights: {
      ...baseConfig.tokens.lineHeights,
      xs: 16,
      sm: 20,
      md: 24,
      lg: 28,
      xl: 32,
      '2xl': 36,
      '3xl': 40,
      '4xl': 48,
      '5xl': 56,
    },
    letterSpacings: {
      ...baseConfig.tokens.letterSpacings,
      tight: -0.5,
      normal: 0,
      wide: 0.5,
    },
  },
  semanticTokens: {
    ...baseConfig.semanticTokens,
    colors: {
      ...baseConfig.semanticTokens?.colors,
      background: {
        default: '$backgroundLight0',
        _dark: '$backgroundDark0',
      },
      cardBackground: {
        default: '$cardLight',
        _dark: '$cardDark',
      },
      borderColor: {
        default: '$borderLight0',
        _dark: '$borderDark0',
      },
      textPrimary: {
        default: '$textLight0',
        _dark: '$textDark0',
      },
      textSecondary: {
        default: '$textLight200',
        _dark: '$textDark200',
      },
      textMuted: {
        default: '$textLight300',
        _dark: '$textDark300',
      },
      accent: {
        default: '$primary0',
        _dark: '$textDark0',
      },
      // Override default primary colors
      primary: {
        default: '$primary0',
        _dark: '$textDark0',
      },
      primary50: {
        default: '$primary50',
        _dark: '$primary50',
      },
      primary100: {
        default: '$primary100',
        _dark: '$primary100',
      },
      primary500: {
        default: '$primary0',
        _dark: '$textDark0',
      },
      primary600: {
        default: '$primary0',
        _dark: '$textDark0',
      },
    },
  },
});

export type AppTheme = typeof theme;