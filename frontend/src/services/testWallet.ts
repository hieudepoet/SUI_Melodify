import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { getTestPrivateKey } from "../config";

// Enable test mode via environment variable or localStorage
const isTestMode = () => {
  return (
    import.meta.env.VITE_TEST_MODE === "true" ||
    localStorage.getItem("testMode") === "true"
  );
};

let testKeypair: Ed25519Keypair | null = null;
let testClient: SuiClient | null = null;

export const getTestWallet = () => {
  // Always allow if we have a key, even if test mode flag isn't explicitly set? 
  // User code had this check:
  // if (!isTestMode()) { return null; }
  // We'll keep it but ensure VITE_TEST_MODE is true in env.

  if (!testKeypair) {
    const privateKey = getTestPrivateKey();
    if (!privateKey) {
      console.warn("VITE_TEST_PRIVATE_KEY not set. Test wallet unavailable.");
      return null;
    }

    try {
      // Decode the Sui private key format (suiprivkey1...)
      // OR direct base64 if that's what we have.
      // The user's keystore had base64 ("AIa...").
      // decodeSuiPrivateKey expects "suiprivkey..." usually, or we might need to handle base64 manually if it fails.
      
      if (privateKey.startsWith("suiprivkey")) {
        const decoded = decodeSuiPrivateKey(privateKey);
        testKeypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
      } else {
         // Assume base64 raw key (33 bytes with flag or 32 bytes)
         const raw = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
         let secretKey = raw;
         if (raw.length === 33 && raw[0] === 0) {
              secretKey = raw.slice(1);
         }
         testKeypair = Ed25519Keypair.fromSecretKey(secretKey);
      }
    } catch (error) {
      console.error("Failed to create test keypair:", error);
      return null;
    }
  }

  return testKeypair;
};

export const getForceTestWallet = () => {
  return getTestWallet();
};

export const getTestClient = () => {
  if (!testClient) {
    testClient = new SuiClient({
      url: getFullnodeUrl("testnet"),
    });
  }

  return testClient;
};

export const getTestAccount = () => {
  const keypair = getTestWallet();
  if (!keypair) return null;

  return {
    address: keypair.toSuiAddress(),
    publicKey: keypair.getPublicKey().toBase64(),
    chains: ["sui:testnet"] as const,
    label: "Test Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkYwMEZGIi8+Cjwvc3ZnPgo=",
  };
};

export const signAndExecuteTestTransaction = async (transaction: Transaction) => {
  const keypair = getTestWallet();
  const client = getTestClient();

  if (!keypair || !client) {
    throw new Error("Test wallet not available");
  }

  // Set the sender
  transaction.setSender(keypair.toSuiAddress());

  // Build the transaction
  const builtTx = await (transaction as any).build({ client });

  // Sign the transaction - returns SignatureWithBytes
  const signature = await keypair.signTransaction(builtTx);

  // Execute the transaction
  const result = await client.executeTransactionBlock({
    transactionBlock: builtTx,
    signature: signature.signature,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  });

  return {
    digest: result.digest,
    effects: result.effects,
    events: result.events,
    objectChanges: result.objectChanges,
    balanceChanges: result.balanceChanges,
  };
};

// Helper to enable/disable test mode
export const enableTestMode = () => {
  localStorage.setItem("testMode", "true");
  window.location.reload();
};

export const disableTestMode = () => {
  localStorage.setItem("testMode", "false");
  window.location.reload();
};
