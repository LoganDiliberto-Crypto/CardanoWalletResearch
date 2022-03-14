//offline implementation of cardano wallet

// var EC = require('elliptic').ec;
import bip39 from "bip39";
import cardanolib, {
  PrivateKey,
} from "@emurgo/cardano-serialization-lib-nodejs";

import curve from "elliptic";
import sha512 from "js-sha512";

import fs from "fs";
import readline from "readline";
import readlinesync from "readline-sync";
import assert from "assert";

import config from "../../extras/epoch_config.json";

import { checkUtxos, checkTransactions } from "../utils.js";

import blockfrost from "@blockfrost/blockfrost-js";

import {
  lovelaceToAda,
  adaToLovelace,
  getUtxos,
  getBalance,
  checkAddress,
  getTransactions,
  submitTx,
} from "../utils.js";

const blockfrost_api_key = "testnetBQXjqOI1c5DLckWEPsKddc062taGEjD2";

const blockfrost_api = new blockfrost.BlockFrostAPI({
  projectId: blockfrost_api_key,
});

const harden = (num) => {
  return 0x80000000 + num;
};

const getWallet = async () => {
  //const mnemonic = bip39.generateMnemonic();
  const mnemonic =
    "muffin shaft fatal nice tiger army whale scare blush arrest sleep potato crawl join version jar prevent antenna six convince manual eyebrow illness enhance";

  const seed = bip39.mnemonicToEntropy(mnemonic);

  const rootKey = cardanolib.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(seed, "hex"),
    Buffer.from("")
  );

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
    const accountKey = rootKey
      .derive(harden(1852)) // purpose
      .derive(harden(1815)) // coin type
      .derive(harden(0));

    const utxoPubKey = accountKey
      .derive(role) // external
      .derive(index)
      .to_public();

    const utxo_priv_key = accountKey
      .derive(role) // external
      .derive(index);

    const changeKey = accountKey
      .derive(role) // internal
      .derive(index)
      .to_public();

    const stakeKey = accountKey
      .derive(2) // chimeric
      .derive(0)
      .to_public();

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

    await utxos.forEach(async (utxo) => {
      unspent_transactions.push({
        address: address,
        child: utxo_priv_key,
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

  console.log(unspent_transactions);

  unspent_transactions.forEach((utxo) => {
    balance += parseInt(utxo.input_value);
  });

  return {
    utxos: unspent_transactions,
    unused: unused,
    balance: balance,
    change: unused_change,
  };
};

const start = async () => {

  const wallet = await getWallet();

  //Fees are constructed around two constants (a and b). The formula for calculating minimal fees for a transaction (tx) is a * size(tx) + b
  const simple_tx_fee = config.min_fee_a * 300 + config.min_fee_b;

  console.log("New address:", wallet.unused[0]);
  console.log(
    "Balance in lovelace:",
    wallet.balance,
    "| in ADA:",
    lovelaceToAda(wallet.balance)
  );

  const payment_address =
    "addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3";

  const value = adaToLovelace(5);
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

    let utxoValueSum = 0,
      signers = [];
    wallet.utxos.forEach((utxo) => {
      if (utxoValueSum >= value + simple_tx_fee) {
        return;
      }
      utxoValueSum += utxo.input_value;
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

      signers.push(utxo.child); // track which addresses' utxos are being used
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

    //NO METADATA

    await txBuilder.set_ttl(52858914);

    console.log("change being set");
    await txBuilder.add_change_if_needed(
      cardanolib.Address.from_bech32(wallet.change[0])
    );

    console.log("signing tx");
    const newTx = await txBuilder.build_tx();
    const txHash = await cardanolib.hash_transaction(newTx.body());

    const witnesses = await cardanolib.TransactionWitnessSet.new();
    const vkeyWitnesses = await cardanolib.Vkeywitnesses.new();
    

    signers.forEach( (signer) => {
      let vkeyWitness = cardanolib.make_vkey_witness(
        txHash,
        signer.to_raw_key()
      );
      vkeyWitnesses.add(vkeyWitness);
    });
    witnesses.set_vkeys(vkeyWitnesses);

    const signed_transaction = await cardanolib.Transaction.new(
      newTx.body(),
      witnesses,
      //no metadata -> undefined for now... note adding metadata increases fees to about
      undefined
    );

    const txHex = await Buffer.from(signed_transaction.to_bytes()).toString(
      "hex"
    );

    console.log(await submitTx(txHex));

    console.log(txHex);
  } catch (error) {
    console.log(error);
    return error;
  }
};

start();
