import bip39 from "bip39";
import cardanolib from "@emurgo/cardano-serialization-lib-nodejs";

import fs from "fs";

import { harden } from "../utils.js";

const createWallet = async () => {
  const mnemonic =
    "muffin shaft fatal nice tiger army whale scare blush arrest sleep potato crawl join version jar prevent antenna six convince manual eyebrow illness enhance";

  const seed = bip39.mnemonicToEntropy(mnemonic);

  const rootKey = cardanolib.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(seed, "hex"),
    Buffer.from("")
  );

  const accountKey = rootKey
      .derive(harden(1852)) // purpose
      .derive(harden(1815)) // coin type
      .derive(harden(0));

  const xpub = {xpub: accountKey.to_public().to_bech32()};

  fs.writeFile("./src/wallet-database/pubkey.json", JSON.stringify(xpub), (err) => {
    if (err) throw err;;
  });

};

createWallet();
