/**
 * OneWallet browser extension helpers.
 *
 * OneWallet injects a `window.oneWallet` object that exposes
 * account and signing methods similar to browser wallets on Sui.
 */

/** Shape of the injected OneWallet provider */
export interface OneWalletProvider {
  /** Request the user to approve account access. Returns an array of addresses. */
  requestAccounts(): Promise<string[]>;
  /** Get the currently connected accounts (no popup). */
  getAccounts(): Promise<string[]>;
  /** Sign transaction bytes (base64-encoded). Returns a base64-encoded signature. */
  signTransaction(txBytes: string): Promise<string>;
  /** Disconnect the wallet. */
  disconnect(): Promise<void>;
  /** Listen for account change events. */
  on(event: "accountChanged", cb: (accounts: string[]) => void): void;
  /** Remove a previously registered listener. */
  off(event: "accountChanged", cb: (accounts: string[]) => void): void;
}

declare global {
  interface Window {
    oneWallet?: OneWalletProvider;
  }
}

/**
 * Check whether the OneWallet browser extension is installed and available.
 */
export function isWalletInstalled(): boolean {
  return typeof window !== "undefined" && !!window.oneWallet;
}

/**
 * Request account access from OneWallet.
 * Returns the first connected address, or throws if the user rejects or
 * the extension is not installed.
 */
export async function connectWallet(): Promise<string> {
  if (!isWalletInstalled()) {
    throw new Error(
      "OneWallet extension is not installed. Please install it from the OneChain website."
    );
  }

  const accounts = await window.oneWallet!.requestAccounts();
  if (accounts.length === 0) {
    throw new Error("No accounts returned from OneWallet. Please create or unlock your wallet.");
  }
  return accounts[0];
}

/**
 * Sign a base64-encoded transaction with OneWallet.
 * Returns the base64-encoded signature string.
 */
export async function signTransaction(txBytes: string): Promise<string> {
  if (!isWalletInstalled()) {
    throw new Error("OneWallet extension is not installed.");
  }

  const signature = await window.oneWallet!.signTransaction(txBytes);
  return signature;
}

/**
 * Disconnect the wallet.
 */
export async function disconnectWallet(): Promise<void> {
  if (isWalletInstalled()) {
    await window.oneWallet!.disconnect();
  }
}
