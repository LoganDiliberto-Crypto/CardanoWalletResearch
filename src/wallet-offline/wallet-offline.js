//offline implementation of cardano wallet

// var EC = require('elliptic').ec;
import bip39 from "bip39";
import cardanolib from "@emurgo/cardano-serialization-lib-nodejs";

import curve from "elliptic";
import sha512 from "js-sha512";

import fs from "fs";
import readline from "readline";
import readlinesync from "readline-sync";
import assert from "assert";

import { checkUtxos, checkTransactions } from "../utils.js";

import blockfrost from "@blockfrost/blockfrost-js";

import { lovelaceToAda } from "../utils.js";

const blockfrost_api_key = "testnetBQXjqOI1c5DLckWEPsKddc062taGEjD2";

const blockfrost_api = new blockfrost.BlockFrostAPI({
  projectId: blockfrost_api_key,
});

const harden = (num) => {
  return 0x80000000 + num;
};

const start = async () => {
  //const mnemonic = bip39.generateMnemonic();
  const mnemonic =
    "";

  const seed = bip39.mnemonicToEntropy(mnemonic);

  const rootKey = cardanolib.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(seed, "hex"),
    Buffer.from("")
  );

  let total = 0;

  for (let i = 0; i < 20; i++) {
    const accountKey = rootKey
      .derive(harden(1852)) // purpose
      .derive(harden(1815)) // coin type
      .derive(harden(0));

    const utxoPubKey = accountKey
      .derive(0) // external
      .derive(i)
      .to_public();

    const stakeKey = accountKey
      .derive(2) // chimeric
      .derive(0)
      .to_public();

    const baseAddr = cardanolib.BaseAddress.new(
      cardanolib.NetworkInfo.testnet().network_id(),
      cardanolib.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
      cardanolib.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
    );

    const address = baseAddr.to_address().to_bech32();
    console.log("Address", i+1 + ":", address);

    // const address_utxo = await blockfrost_api.addressesUtxos(address);

    // console.log(
    //   "Current address amount:",
    //   lovelaceToAda(address_utxo[0].amount[0].quantity)
    // );

    // total += lovelaceToAda(address_utxo[0].amount[0].quantity);
  }
  // console.log("Wallet Total:", total);
};

start();
