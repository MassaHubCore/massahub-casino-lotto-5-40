import {
  Account, Args,
  bytesToStr,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import 'dotenv/config';

// Paste the address of the deployed contract here
const CONTRACT_ADDR = 'AS12NNu16uULFp2fEGGwX3AyKEsT9suDojpcFuZjyLPjv5FWzYcNX';

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

const helloContract = new SmartContract(provider, CONTRACT_ADDR);

// await helloContract.call('finalizeLotto');
const messageBin = await helloContract.read('getCurrentLotto');

// deserialize message
const result = bytesToStr(messageBin.value);

console.log(`Received from the sc: ${result}`);
