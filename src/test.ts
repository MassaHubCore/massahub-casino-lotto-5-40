import 'dotenv/config';
import { Account, Args, Web3Provider } from '@massalabs/massa-web3';
import { fromString } from '@massalabs/massa-web3/dist/cmd/basicElements/mas';

const CONTRACT_ADDR = 'AS12XiLbNywJ3DTi16nx61iPEvEJ92Pf4YoLUm7wNLi83nmKH3ofK';

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

const args = new Args()
  .addString('100')
  .addString('AU1Napk1mmLD8YzwQ64Mhy8VPuywT7JGX31ghGo5aMRkGouJA4M4');

const params = {
  func: 'supplyDeposit',
  target: CONTRACT_ADDR,
  coins: fromString('101'),
  fee: fromString('0.01'),
  parameter: args,
};

await provider.callSC(params).then(value => {
  console.log(value);
});
