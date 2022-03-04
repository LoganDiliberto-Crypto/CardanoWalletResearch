# Cardano Wallet Implementation

## Cardano Wallet Server

`node src/wallet-store/wallet-node.js`

Shows user wallets on current walletServer, prompts to make or restore existing wallet, and make transactions.

Wallet Server is ran under localhost at port 8081 by default.

## Offline Cardano Wallet

Using `cardano-serialization-lib` create an offline wallet using mnemonic/seed phrase

Cardano uses a new alternative proposal for BIP32/44, with a suffix of Ed25519 describing the elliptic curve standard which is notable for it's high speed, constant-time implementations, and no requirement for randomness in signature generation.

### BIP39

`const mnemonic = bip39.generateMnemonic();`

1. Creates a random 128-256 bit number.
2. Creates a checksum by taking the first (entropy-length/32) bits of the SHA-256 hash of the entropy.
3. Add the checksum to the end of the entropy.
4. Splits the result into 11-bit segments.
5. Maps each 11-bit segments to a word according to a predefined dictionary.
6. The mnemonic code is the sequence of words, in order.

`const seed = bip39.mnemonicToSeedSync(mnemonic);`
1. Passes the mnemonic and a user provided 'salt' (if not provided, defaults to 'mnemonic') into the PBKDF-2 key stretching function.
2. The PBKDF-2 functions stretches the combination of the entropy and the salt to 512 bits through 2048 rounds of HMAC-SHA512 hashing. The resulting 512 bits is the seed.

### BIP32-Ed25519

`const rootKey = cardanolib.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(seed, "hex"),
    Buffer.from("")
);`

1. Following the Icarus key format, the seed and a user created password (in this case ""), is passed into the PBKDF-2 key stretching function.
2. The PBKDF-2 function stretches the combination of the seed and password to 96 bytes through 4096 rounds of HMAC-SHA512 hashing.
3. The resulting 96 bytes are composed of:
    - 64 bytes: extended ed25519 secret key composed of:
        - 32 bytes: Ed25519 curve scalar with bit manipulation according to ED25519-BIP32: (https://github.com/input-output-hk/adrestia/raw/bdf00e4e7791d610d273d227be877bc6dd0dbcfb/user-guide/static/Ed25519_BIP.pdf).
        - 32 bytes: Ed25519 binary blob (nonce) for signing. 
    - 32 bytes: chain code for allowing child key derivation.
4. In cardano-serialization-lib, instead of `rootKey` as the traditional 96-byte xpriv, it is encoded in a different format of 128 bytes. This is because of software incapababilities. Some softwares may not know how to compute a public key from a private key.
5. Instead of *privateKey | chaincode*, the new format is encoded in the following format: *privateKey | publicKey | chaincode*

### BIP44-Ed25519

Described by CIP 1852, BIP44-Ed25519 extends the previous BIP44 by adding new chains used for different purposes. 

Specified as: `m / purpose' / coin_type' / account' / role / index`

`const accountKey = rootKey
    .derive(harden(1852)) // purpose
    .derive(harden(1815)) // coin type
    .derive(harden(0));
`

1. Understand the new purpose field introduced by CIP 1852, `1852`. Allowing for more specific functionality both now and in the future.
2. Derive the account key under derivation path `m / 1852' / 1815' / 0'`. 

`const utxoPubKey = accountKey
    .derive(0) // external
    .derive(0)
    .to_public();

const stakeKey = accountKey
    .derive(2) // chimeric
    .derive(0)
    .to_public();
`

1. Extend current account key path by identifying the `role` and `index`. Address generation requires both payment and delegation (external chain and staking key, respectively), so that when generated, indicates ownership of funds and the owner of stake rights associated with that address. (staking Key is also known as the "Reward Address".)
2. `utxoPubKey` defines the External chain as role value `0`.
3. `stakeKey` defines the Staking Key as role value `2`.

At the byte level, an address is compromised of two parts, the header and payload. Header is 1 byte, composed of address type and network tag, and payload is a variable length of bytes. Depending on the Header given, the payload can vary. In our case that payload is composed of payment and delegation.

`const baseAddr = cardanolib.BaseAddress.new(
    cardanolib.NetworkInfo.testnet().network_id(),
    cardanolib.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
    cardanolib.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
  );
`

1. Combining the two parts of the address, the following function takes 3 parameters (network id, and two stake credentials) and returns an address encoded with Bech32.
2. Encoded address is led with a human-readable prefix of addr_test. Representing an address on the testnet.

The following address represents the first account index specified earlier in the derivation path.
`addr_test1qpw77shh5267049x394n3g986yvdxgs9mkj45w7szwq9gehm3wc0mdm3epq0uq53ul8yt4p737kglcyv84pk83tjdjfsyek3t0`












