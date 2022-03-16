import wallet_data from "../../src/wallet-database/unsignedtx.json";
import { harden } from "../utils.js";
import bip39 from "bip39";
import cardanolib from "@emurgo/cardano-serialization-lib-nodejs";
import { decode, encode } from "cbor-x";
import nacl from "tweetnacl";

import {
  submitTx,
} from "../utils.js";

var tx_cbor = wallet_data.tx;
console.log("unsigned transaction as cbor:", tx_cbor);

const unsigned_tx = cardanolib.Transaction.from_bytes(
  Buffer.from(tx_cbor, "hex")
);

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

console.log(
  "CBOR unsigned:",
  await Buffer.from(unsigned_tx.to_bytes()).toString("hex")
);

const signed_transaction = await cardanolib.Transaction.new(
  unsigned_tx.body(),
  witnesses,
  //no metadata -> undefined for now... note adding metadata increases fees to about 450?
  undefined
);

const signed_transaction_cbor = await Buffer.from(
  signed_transaction.to_bytes()
).toString("hex");

console.log("CBOR signed tx:", signed_transaction_cbor);

// console.log(
//   "View in Cardanoscan: https://testnet.cardanoscan.io/transaction/" +
//     (await submitTx(signed_transaction_cbor))
// );