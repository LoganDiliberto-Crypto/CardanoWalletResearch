import bip39 from "bip39";
import cardanolib from "@emurgo/cardano-serialization-lib-nodejs";

import key from "../../src/wallet-database/pubkey.json" assert { type: "json" };

// import blockfrost from "@blockfrost/blockfrost-js";

import fs from "fs";

import { lovelaceToAda, getUtxos, getTransactions, harden } from "../utils.js";

//blockfrost api
// const blockfrost_api_key = "testnetBQXjqOI1c5DLckWEPsKddc062taGEjD2";

// const blockfrost_api = new blockfrost.BlockFrostAPI({
//   projectId: blockfrost_api_key,
// });

const getWallet = async () => {
  //const mnemonic = bip39.generateMnemonic();
  // const mnemonic =
  //   "muffin shaft fatal nice tiger army whale scare blush arrest sleep potato crawl join version jar prevent antenna six convince manual eyebrow illness enhance";

  console.log(key.xpub);
  // const seed = bip39.mnemonicToEntropy(mnemonic);

  const accountKey = await cardanolib.Bip32PublicKey.from_bech32(key.xpub);

  let balance = 0;
  let unused = [];
  let unused_change = [];
  let address_count = 0;
  let index = 0;
  let is_change = false;
  let unspent_transactions = [];

  console.log("Deriving Addresses...");

  while (address_count < 20) {
    let role = is_change ? 1 : 0;
    // todo | request xpub from above derivation path... -> m/1852'/1815'/0'
    // as of now public key can only deriv softened addresses


    // xpub/role/index
    const utxoPubKey = accountKey
      .derive(role) // external
      .derive(index);

    const changeKey = accountKey
      .derive(role) // internal
      .derive(index);

    const stakeKey = accountKey
      .derive(2) // chimeric
      .derive(0);

    let stake_credential = is_change
      ? changeKey.to_raw_key().hash()
      : utxoPubKey.to_raw_key().hash();

    const addr_decoded = cardanolib.BaseAddress.new(
      cardanolib.NetworkInfo.testnet().network_id(),
      cardanolib.StakeCredential.from_keyhash(stake_credential),
      cardanolib.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
    );

    const address = addr_decoded.to_address().to_bech32();

    const transactions = await getTransactions(address);

    //reset gap if transaction is found..
    if (transactions.length > 0 && !is_change) {
      address_count = 0;
    }

    if (transactions.length == 0 && !is_change) {
      unused.push(address);
      address_count++;
    }

    if (transactions.length == 0 && is_change) {
      unused_change.push(address);
      address_count++;
    }

    if (transactions.length == 0) {
      if (is_change) {
        index++;
      }
      is_change = !is_change;
      continue;
    }

    const utxos = await getUtxos(address);

    let path_info = { role: role, index: index };

    await utxos.forEach(async (utxo) => {
      unspent_transactions.push({
        address: address,
        path: path_info,
        tx_hash: utxo.tx_hash,
        tx_index: utxo.tx_index,
        input_value: utxo.amount[0].quantity,
      });
    });
    if (is_change) {
      index++;
    }
    is_change = !is_change;
  }

  while (unused_change.length == 0) {
    const changeKey = accountKey
      .derive(1) // internal
      .derive(index)

    const stakeKey = accountKey
      .derive(2) // chimeric
      .derive(0)

    const addr_decoded = cardanolib.BaseAddress.new(
      cardanolib.NetworkInfo.testnet().network_id(),
      cardanolib.StakeCredential.from_keyhash(changeKey.to_raw_key().hash()),
      cardanolib.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
    );

    const change_address = addr_decoded.to_address().to_bech32();

    const transactions = await getTransactions(change_address);

    if (transactions.length == 0 && is_change) {
      unused_change.push(change_address);
    } else {
      index++;
    }
  }

  unspent_transactions.forEach((utxo) => {
    balance += parseInt(utxo.input_value);
  });

  let wallet_db = {
    wallet_data: [],
  };

  wallet_db.wallet_data.push({
    utxos: unspent_transactions,
    unused: unused[0],
    balance: balance,
    change: unused_change[0],
  });

  const wallet_json = JSON.stringify(wallet_db);

  fs.writeFile("./src/wallet-database/utxos.json", wallet_json, "utf8", () => {
    return;
  });

  console.log("\nNew address:", unused[0]);
  console.log(
    "Balance in lovelace:",
    balance,
    "| in ADA:",
    lovelaceToAda(balance)
  );

  console.log("\nSent to [./src/wallet-database/utxos.json]");
};

getWallet();
