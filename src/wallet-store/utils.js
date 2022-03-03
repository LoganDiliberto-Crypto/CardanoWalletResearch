import { Seed, WalletServer } from "cardano-wallet-js";

const walletServer = WalletServer.init("http://localhost:8081/v2");

// All utils.

// Node Functions
export const createOrRestoreWallet = async (name, mnemonic, passphrase) => {
  try {
    let wallet = await walletServer.createOrRestoreShelleyWallet(
      name,
      mnemonic,
      passphrase
    );
    return wallet;
  } catch (e) {
    console.log(e.response.status);
    console.log("Wallet already exists:", e.response.data.message);
  }
};

//online transaction
export const sendTransaction = async (wallet, address, amount, passphrase) => {
  let transaction = await wallet.sendPayment(passphrase, address, amount);
  console.log(
    "Sent! View in Cardanoscan: https://testnet.cardanoscan.io/transaction/" +
      transaction.id
  );
};

//offline transaction
export const sendExternalTransaction = async (
  wallet,
  receivingAddress,
  amount,
  mnemonic
) => {
  //required for transaction builder
  let info = await checkWalletStatus();
  // time to live, not necessary for single transactions, but due to cardanos consistency, it is required.
  let ttl = info.node_tip.absolute_slot_number * 12000;
  let address = (await wallet.getUnusedAddresses()).slice(0, 1);

  //optional metadata
  let data = { 0: "this is a test transaction." };

  //define inputs and outputs
  let coinSelection = await wallet.getCoinSelection(address, amount, data);
  coinSelection = JSON.parse(JSON.stringify(coinSelection));
  coinSelection.outputs[0].address = receivingAddress;

  //define root and priv
  let rootKey = Seed.deriveRootKey(mnemonic);
  let signingKeys = coinSelection.inputs.map((input) => {
    let privateKey = Seed.deriveKey(
      rootKey,
      input.derivation_path
    ).to_raw_key();
    return privateKey;
  });

  //build and sign tx
  let metadata = Seed.buildTransactionMetadata(data);
  let builtTX = Seed.buildTransaction(coinSelection, ttl, {
    metadata: metadata,
  });
  let txBody = Seed.sign(builtTX, signingKeys, metadata);

  let signed = Buffer.from(txBody.to_bytes()).toString("hex");
  console.log("SiGNED TRANSACTION (AS HEX)", txBody);

  let txId = await walletServer.submitTx(signed);
  console.log(
    "\n" +
      "Sent! View in Cardanoscan: https://testnet.cardanoscan.io/transaction/" +
      txId
  );
};

//Check synching state of Wallet Server
export const checkWalletStatus = async () => {
  let info = await walletServer.getNetworkInformation();
  return info;
};
