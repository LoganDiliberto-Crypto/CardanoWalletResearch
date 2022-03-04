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

const harden = (num) => {
  return 0x80000000 + num;
};

const start = () => {
  //const mnemonic = bip39.generateMnemonic();
  const mnemonic =
    "muffin shaft fatal nice tiger army whale scare blush arrest sleep potato crawl join version jar prevent antenna six convince manual eyebrow illness enhance";

  const seed = bip39.mnemonicToEntropy(mnemonic);

  const rootKey = cardanolib.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(seed, "hex"),
    Buffer.from("")
  );

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
      .derive(i)
      .to_public();

    const baseAddr = cardanolib.BaseAddress.new(
      cardanolib.NetworkInfo.testnet().network_id(),
      cardanolib.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
      cardanolib.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
    );

    const address = baseAddr.to_address().to_bech32();
    console.log("Address", i+1 + ":", address);
  }
};

start();
