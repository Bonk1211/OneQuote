import { createNetworkConfig, lightTheme } from "@mysten/dapp-kit";

const { networkConfig } = createNetworkConfig({
  testnet: {
    url:
      process.env.NEXT_PUBLIC_ONECHAIN_RPC_URL ||
      "https://rpc-testnet.onelabs.cc:443",
    network: "testnet",
  },
});

/** Dark theme matching the QuoteGuard zinc/indigo design system */
const darkTheme: typeof lightTheme = {
  blurs: {
    modalOverlay: "blur(0)",
  },
  backgroundColors: {
    primaryButton: "#4F46E5",
    primaryButtonHover: "#4338CA",
    outlineButtonHover: "rgba(79,70,229,0.1)",
    walletItemHover: "#27272A",
    walletItemSelected: "#27272A",
    modalOverlay: "rgba(0,0,0,0.6)",
    modalPrimary: "#18181B",
    modalSecondary: "#09090B",
    iconButton: "transparent",
    iconButtonHover: "#27272A",
    dropdownMenu: "#18181B",
    dropdownMenuSeparator: "#27272A",
  },
  borderColors: {
    outlineButton: "#3F3F46",
  },
  colors: {
    primaryButton: "#FFFFFF",
    outlineButton: "#A1A1AA",
    body: "#FAFAFA",
    bodyMuted: "#71717A",
    bodyDanger: "#EF4444",
    iconButton: "#A1A1AA",
  },
  radii: {
    small: "6px",
    medium: "8px",
    large: "12px",
    xlarge: "16px",
  },
  shadows: {
    primaryButton: "0 4px 12px rgba(79,70,229,0.4)",
    walletItemSelected: "0 0 0 2px #4F46E5",
  },
  fontWeights: {
    normal: "400",
    medium: "500",
    bold: "600",
  },
  fontSizes: {
    small: "0.875rem",
    medium: "1rem",
    large: "1.125rem",
    xlarge: "1.25rem",
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    fontStyle: "normal",
    lineHeight: "1.5",
    letterSpacing: "normal",
  },
};

export { networkConfig, darkTheme };
