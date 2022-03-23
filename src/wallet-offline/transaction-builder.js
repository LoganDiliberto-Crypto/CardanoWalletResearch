import wallet_data from "../../src/wallet-database/utxos.json" assert { type: "json" };
import config from "../../extras/epoch_config.json" assert { type: "json" };
import cardanolib from "@emurgo/cardano-serialization-lib-nodejs";
import fs from "fs";
import { adaToLovelace, getBlockInfo } from "../utils.js";

const start = async () => {
  //read utxos
  const wallet = wallet_data.wallet_data[0];

  //Fees are constructed around two constants (a and b). The formula for calculating minimal fees for a transaction (tx) is a * size(tx) + b
  //Simple tx size is 300
  const simple_tx_fee = config.min_fee_a * 300 + config.min_fee_b;

  //for ttl
  const block_info = await getBlockInfo();
  const slot_num = block_info.slot;

  //define transaction recipient and value
  const payment_address =
    "addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3";
  const value = adaToLovelace(20);

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
    // signers = [];
    wallet.utxos.forEach((utxo) => {
      if (utxoValueSum >= value + simple_tx_fee) {
        return;
      }
      utxoValueSum += parseInt(utxo.input_value);
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
      paths.push(utxo.path);
      // signers.push(utxo.child); // track which addresses' utxos are being used
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
    await txBuilder.set_ttl(slot_num + 200);

    console.log("\nSetting Change");
    await txBuilder.add_change_if_needed(
      cardanolib.Address.from_bech32(wallet.change)
    );

    console.log("\nBuilding Transaction");
    const newTx = await txBuilder.build_tx();
    console.log("\nBuilt.");

    let cbor_unsigned = await Buffer.from(newTx.to_bytes()).toString("hex");

    const unsigned_tx_obj = {
      tx: cbor_unsigned,
      path: paths,
    };

    await cardanolib.hash_transaction(newTx.body());

    await Buffer.from(newTx.body().to_bytes()).toString("hex");
    // console.log("\nCBOR BODY unsigned:", txBodyHex);

    console.log("\nCBOR unsigned:", cbor_unsigned);

    fs.writeFile(
      "./src/wallet-database/unsignedtx.json",
      JSON.stringify(unsigned_tx_obj),
      "utf8",
      () => {}
    );
  } catch (error) {
    console.log(error);
    return error;
  }
};

start();
