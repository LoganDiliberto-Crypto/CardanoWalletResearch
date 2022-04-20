import bip39 from "bip39";
import cardanolib from "@emurgo/cardano-serialization-lib-nodejs";

import fs from "fs";

import { harden } from "../utils.js";

const createWallet = async () => {
  const mnemonic =
    "copy vast such slogan life educate meat bitter bus grief survey trip reopen scrap north swing write arm celery exit quit fork vintage praise";

  const seed = bip39.mnemonicToEntropy(mnemonic);

  const rootKey = cardanolib.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(seed, "hex"),
    Buffer.from("")
  );

  const accountKey = rootKey
      .derive(harden(1852)) // purpose
      .derive(harden(1815)) // coin type
      .derive(harden(0)); //account

  const xpub = {xpub: accountKey.to_public().to_bech32()};

  fs.writeFile("./src/wallet-database/pubkey.json", JSON.stringify(xpub), (err) => {
    if (err) throw err;;
  });

};

createWallet();
