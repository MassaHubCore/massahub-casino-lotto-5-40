/* eslint-disable no-console */
import { Account, Web3Provider } from '@massalabs/massa-web3';
import { getScByteCode } from './utils';
import { fromString } from '@massalabs/massa-web3/dist/cmd/basicElements/mas';

let SC_ADDRESS = 'AS1WmCCWQBgKRxgcVGCC7Vy3kr9GU7STaV4kHjsCjcqYy5A3X7z7';

const account = await Account.fromEnv();
const provider = Web3Provider.mainnet(account);

console.log('Updating contract...');

const byteCode = getScByteCode('build', 'lotto-4-50.wasm');

const params = {
  func: 'adminUpgradeSmartContract',
  target: SC_ADDRESS,
  fee: fromString('0.01'),
  parameter: byteCode,
};

provider.callSC(params).then();
