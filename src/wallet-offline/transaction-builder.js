import key from "../wallet-database/pubkey.json" assert { type: "json" };

import config from "../../extras/epoch_config.json" assert { type: "json" };
import cardanolib from "@emurgo/cardano-serialization-lib-nodejs";
import fs from "fs";

import {
  lovelaceToAda,
  getUtxos,
  getTransactions,
  adaToLovelace,
  getBlockInfo,
  writeRecords,
} from "../utils.js";

const getWallet = async () => {
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

    //Sets stake_credential to either changeKey or utxoPubKey based on is_change
    let stake_credential = is_change
      ? changeKey.to_raw_key()
      : utxoPubKey.to_raw_key();

    const addr_decoded = cardanolib.BaseAddress.new(
      cardanolib.NetworkInfo.testnet().network_id(),
      cardanolib.StakeCredential.from_keyhash(stake_credential.hash()),
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
        pubKey: stake_credential,
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
      .derive(index);

    const stakeKey = accountKey
      .derive(2) // chimeric
      .derive(0);

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

  let data = {
    utxos: unspent_transactions,
    unused: unused[0],
    balance: balance,
    change: unused_change[0],
  };

  wallet_db.wallet_data.push(data);

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

  console.log("\nUTXOs sent to [./src/wallet-database/utxos.json]");

  return data;
};

const buildTransaction = async () => {
  const wallet_data = await getWallet();

  const simple_tx_fee = config.min_fee_a * 300 + config.min_fee_b;

  //for ttl
  const block_info = await getBlockInfo();
  const slot_num = block_info.slot;

  //define transaction recipient and value
  const payment_address =
    "addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3";
  const value = adaToLovelace(1);
  var signatureRequests = [];
  try {
    const txBuilder = cardanolib.TransactionBuilder.new(
      cardanolib.TransactionBuilderConfigBuilder.new()
        .coins_per_utxo_word(
          cardanolib.BigNum.from_str(config.coins_per_utxo_word)
        )
        .fee_algo(
          cardanolib.LinearFee.new(
            cardanolib.BigNum.from_str(config.min_fee_a.toString()),
            cardanolib.BigNum.from_str(config.min_fee_b.toString())
          )
        )
        .key_deposit(cardanolib.BigNum.from_str(config.key_deposit))
        .pool_deposit(cardanolib.BigNum.from_str(config.pool_deposit))
        .max_tx_size(config.max_tx_size)
        .max_value_size(config.max_val_size)
        .prefer_pure_change(true)
        .build()
    );

    let paths = [];
    let utxoValueSum = 0;

    let used_utxos = [];
    wallet_data.utxos.forEach((utxo) => {
      if (utxoValueSum >= value + simple_tx_fee) {
        return;
      }
      utxoValueSum += parseInt(utxo.input_value);
      used_utxos.push(utxo);

      txBuilder.add_input(
        cardanolib.Address.from_bech32(utxo.address),
        cardanolib.TransactionInput.new(
          cardanolib.TransactionHash.from_bytes(
            Buffer.from(utxo.tx_hash, "hex")
          ),
          utxo.tx_index
        ),
        cardanolib.Value.new(cardanolib.BigNum.from_str(utxo.input_value))
      );
    });

    txBuilder.add_output(
      cardanolib.TransactionOutputBuilder.new()
        .with_address(cardanolib.Address.from_bech32(payment_address))
        .next()
        .with_value(
          cardanolib.Value.new(cardanolib.BigNum.from_str(value.toString()))
        )
        .build()
    );

    //time to live
    await txBuilder.set_ttl(slot_num + 300);

    await txBuilder.add_change_if_needed(
      cardanolib.Address.from_bech32(wallet_data.change)
    );

    console.log("\nBuilding Transaction");
    const newTx = await txBuilder.build_tx();
    console.log("\nBuilt.");

    let cbor_unsigned = await Buffer.from(newTx.to_bytes()).toString("hex");

    const unsigned = cardanolib.Transaction.from_bytes(newTx.to_bytes());
    const message = await cardanolib.hash_transaction(unsigned.body());
    var x = Buffer.from(message.to_bytes()).toString("hex");

    used_utxos.forEach((utxo) => {
      var unsigned_tx_obj = {
        message: x,
        publicKey: utxo.pubKey.to_bech32(),
        path: "m/1852'/1815'/0'/" + utxo.path.role + "/" + utxo.path.index,
        curve: "ed25519",
      };
      signatureRequests.push(unsigned_tx_obj);
    });

    await cardanolib.hash_transaction(newTx.body());

    await Buffer.from(newTx.body().to_bytes()).toString("hex");
    // console.log("\nCBOR BODY unsigned:", txBodyHex);

    console.log("\nCBOR unsigned:", cbor_unsigned);

    const request = {
      preImage: cbor_unsigned,
      signatureRequests: signatureRequests,
    };

    writeRecords(null, request);
  } catch (error) {
    console.log(error);
    return error;
  }
};

buildTransaction();
