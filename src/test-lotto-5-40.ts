import {
  Account,
  Args,
  bytesToStr,
  Mas,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import 'dotenv/config';
import { buyTicket, getTicketPrice, getTickets } from '../assembly/contracts/lotto-4-50';
import { Ticket } from '../assembly/contracts/serializable/Ticket';

// Paste the address of the deployed contract here
const CONTRACT_ADDR = 'AS1hgaBS5juTQa8aVPYZ8oTjbitmak47XViAebbJYBAKERUkHQ18';

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

const sc = new SmartContract(provider, CONTRACT_ADDR);

// let sTicket =
//   '{\n' + '   "address": "",\n' + '  "numbers": [1,2,3,4,5]\n' + '}';
// let args = new Args().addString(sTicket);
//
// await sc
//   .call('buyTicket', args, { coins: Mas.fromString('10'), fee: Mas.fromString('0.01') })
//   .then((value) => {
//     console.log(value);
//   });
const messageBin = await sc.read('getCurrentLotto');

const result = bytesToStr(messageBin.value);

console.log(`Received from the sc: ${result}`);
console.log(`Received from the sc: ${messageBin.info.error}`);
