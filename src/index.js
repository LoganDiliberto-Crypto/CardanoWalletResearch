const {
  Config,
  Seed,
  WalletServer,
  AddressWallet,
} = require("cardano-wallet-js");
const fs = require("fs");
const readline = require("readline");
const readlinesync = require("readline-sync");
const assert = require("assert");
const bip39 = require("bip39");

let walletServer = WalletServer.init("http://localhost:8081/v2");

const start = async () => {
  let wallet_obj = { Wallets: [] };
  //check status
  await checkWalletStatus();

  let wallets = await walletServer.wallets();
  console.log("\nNumber of Wallets:", wallets.length);

  for (let i = 0; i < wallets.length; i++) {
    console.log("Wallet " + (i + 1) + ":", wallets[i].name);
    wallet_obj.Wallets.push({
      Name: wallets[i].name,
      WalletID: wallets[i].id,
      Balance: wallets[i].balance.available,
      Status: wallets[i].state,
      Tip: wallets[i].tip,
    });
  }

  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let mnemonic;
  // requirements... passphrase, mnemonic, or name. If user doesnt have a mnemonic, generate one for them.
  rl.question(
    "\nWould you like to create or restore a new wallet? (y/n)\n>",
    async (a) => {
      rl.close();
      a.toLowerCase();
      if (a == "y") {
        let mnemonic = "";
        mnemonic = readlinesync.question(
          'Enter Existing Mnemonic...or ("new") for new mnemonic.\n>'
        );
        if (mnemonic.toLowerCase() == "new") {
          mnemonic = genMnemonic();
          console.log(
            "Your new mnemonic. Write down in a safe place.\n" + mnemonic
          );
        }
        const final_mnemonic = Seed.toMnemonicList(mnemonic);
        const name = readlinesync.question("Enter Name for Wallet...\n>");
        const passphrase = readlinesync.question("Enter a passphrase...\n>");
        await createOrRestoreWallet(name, final_mnemonic, passphrase);

        console.log("\nNew Wallet created:", name + "\n");
        start();
        
      } else if (a == "n") {
        let senderWallet;
        let current_wallet = readlinesync.question(
          "Which wallet would you like to use?\n> "
        );
        wallets.forEach(async (wallet, index) => {
          if (wallet.name == current_wallet) {
            senderWallet = wallet;
            // senderWallet = await walletServer.getShelleyWallet("1dc8a77b3d1a36d516c0d3c5e21038e4d5afda17");
            console.log("\n" + wallet.name + ":", wallet_obj.Wallets[index]);
          }
        });

        console.log(
          "New unused Address:",
          (await senderWallet.getUnusedAddresses()).slice(0, 1)
        );

        let address = readlinesync.question(
          "What address would you like to send ADA?\n> "
        );

        let amount = readlinesync.question(
          "How much ADA would you like to send?\n> "
        );

        let passphrase = readlinesync.question("Enter passphrase:\n> ", {
          hideEchoBack: true,
        });

        // only for external
        // let signer = readlinesync.question("Enter mnemonic phrase\n> ");

        sendTransaction(
          senderWallet,
          [new AddressWallet(address)],
          [amount * 1000000],
          passphrase
        );
      }
    }
  );
};

const sendTransaction = async (wallet, address, amount, passphrase) => {
  console.log("HERE", wallet);
  // let estimatedFees = await wallet.estimateFee(address, amount);
  let transaction = await wallet.sendPayment(passphrase, address, amount);
  console.log(
    "Sent! View in blockstream: https://testnet.cardanoscan.io/transaction/" +
      transaction.id
  );
};

//TODO...ignore for now
// const sendExternalTransaction = async (address, amount, signers) => {
//   let config = Config.Testnet;
//   let info = await walletServer.getNetworkInformation();
//   let ttl = info.node_tip.absolute_slot_number * 12000;
// };

const createOrRestoreWallet = async (name, mnemonic, passphrase) => {
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

//Check Synching state of Wallet Server
const checkWalletStatus = async () => {
  let info = await walletServer.getNetworkInformation();
  console.log("Wallet Server Status:", info.sync_progress);
};

//generate 24 word mnemonic (Shelley)
const genMnemonic = () => {
  let recoveryPhrase = Seed.generateRecoveryPhrase(24);
  // as arr
  // let recoveryPhraseArr = Seed.toMnemonicList(recoveryPhrase);
  return recoveryPhrase;
};

start();

//testnet SEND BACK | addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3
