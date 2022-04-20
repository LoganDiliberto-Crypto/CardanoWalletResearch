import wallet_data from "../../src/wallet-database/unsignedtx.json" assert {type: "json"};
import { harden } from "../utils.js";
import fs from "fs";
import bip39 from "bip39";
import cardanolib from "@emurgo/cardano-serialization-lib-nodejs";

var tx_cbor = wallet_data.tx;

console.log("\nCBOR unsigned:", tx_cbor);

const unsigned_tx = cardanolib.Transaction.from_bytes(
  Buffer.from(tx_cbor, "hex")
);

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
  .derive(harden(0));

const witnesses = await cardanolib.TransactionWitnessSet.new();
const vkeyWitnesses = await cardanolib.Vkeywitnesses.new();
const txHash = await cardanolib.hash_transaction(unsigned_tx.body());

let signers = wallet_data.path;

signers.forEach((signer) => {
  const priv_key = accountKey
    .derive(signer.role)
    .derive(signer.index)
    .to_raw_key();

  let vkeyWitness = cardanolib.make_vkey_witness(txHash, priv_key);
  vkeyWitnesses.add(vkeyWitness);
});
witnesses.set_vkeys(vkeyWitnesses);

const signed_transaction = await cardanolib.Transaction.new(
  unsigned_tx.body(),
  witnesses,
  //no metadata -> undefined for now... note adding metadata increases fees
  undefined
);

const signed_transaction_cbor = await Buffer.from(
  signed_transaction.to_bytes()
).toString("hex");

console.log("\nCBOR signed tx:", signed_transaction_cbor);

const signed_tx = {tx: signed_transaction_cbor};

fs.writeFile(
  "./src/wallet-database/signedtx.json",
  JSON.stringify(signed_tx),
  "utf8",
  () => {}
);

console.log("\nSigned TX sent to: [./src/wallet-database/signedtx.json]");
