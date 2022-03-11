import bip39 from "bip39";
import { Seed, WalletServer } from "cardano-wallet-js";

import readline from "readline";
import readlinesync from "readline-sync";
import assert from "assert";

import { lovelaceToAda, genMnemonic } from "../utils.js";

import {
  createOrRestoreWallet,
  checkWalletStatus,
  sendExternalTransaction,
  sendTransaction,
} from "./node-utils.js";

const walletServer = WalletServer.init("http://localhost:8081/v2");

const start = async () => {
  //define wallets obj
  let wallet_obj = { Wallets: [] };

  //check status
  console.log(
    "Wallet Server Status:",
    (await checkWalletStatus()).sync_progress
  );
  let wallets = await walletServer.wallets();
  console.log("\nNumber of Wallets:", wallets.length);

  //print existing wallets
  for (let i = 0; i < wallets.length; i++) {
    console.log("Wallet " + (i + 1) + ":", wallets[i].name);
    wallet_obj.Wallets.push({
      Name: wallets[i].name,
      WalletID: wallets[i].id,
      Balance: {
        available: lovelaceToAda(wallets[i].balance.available.quantity),
        unit: "ADA",
      },
      Status: wallets[i].state,
      Tip: wallets[i].tip,
    });
  }

  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

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

        // OFFLINE TRANSACTION
        let mnemonic = readlinesync.question("Enter mnemonic phrase\n> ");

        /////////////////////////////////
        // ONLINE TRANSACTION

        // let passphrase = readlinesync.question("Enter passphrase:\n> ", {
        //   hideEchoBack: true,
        // });

        // sendTransaction(
        //   senderWallet,
        //   [new AddressWallet(address)],
        //   [amount * 1000000],
        //   passphrase
        // );
        /////////////////////////////////

        sendExternalTransaction(
          senderWallet,
          address,
          [amount * 1000000],
          mnemonic
        );
      }
    }
  );
};

//online tx

//offline tx

start();

//testnet SEND BACK | addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3
//shelley-michael | muffin shaft fatal nice tiger army whale scare blush arrest sleep potato crawl join version jar prevent antenna six convince manual eyebrow illness enhance
