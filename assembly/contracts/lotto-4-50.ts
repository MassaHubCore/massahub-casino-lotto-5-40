import { Context, generateEvent, Storage } from '@massalabs/massa-as-sdk';
import { stringToBytes } from '@massalabs/as-types';
import { onlyOwner } from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import { LOTTO_, LOTTO_ROUND_COUNT, OWNER, TICKET_, TICKET_COUNT } from './utils/tags';
import { Lotto } from './serializable/Lotto';
import { Ticket } from './serializable/Ticket';

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract());

  Storage.set(OWNER, Context.caller().toString());
  Storage.set(LOTTO_ROUND_COUNT, '0');
  Storage.set(TICKET_COUNT, '0');
  initLotto();
}

export function getCurrentLotto(): StaticArray<u8> {
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  return Storage.get(stringToBytes(LOTTO_.concat(lottoRoundCount.toString())));
}

export function initLotto(): void {
  onlyOwner();
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);

  const newLottoCount = u64.parse(lottoRoundCount) + 1;
  Storage.set(LOTTO_ROUND_COUNT, newLottoCount.toString());
  const lotto = new Lotto(newLottoCount, 0, 0, 0, [], [], [], []);
  Storage.set(
    LOTTO_.concat(newLottoCount.toString()),
    lotto.serialize(),
  );

  generateEvent(`lottery round ${newLottoCount} begins`);
  finalizeLotto();
}

export function finalizeLotto(): void {
  onlyOwner();
  const lottoRoundCount = Storage.get(LOTTO_ROUND_COUNT);
  generateEvent(
    `Lottery round ${lottoRoundCount} is over, we start drawing the winning numbers`,
  );

  const args = Storage.get(
    LOTTO_.concat(lottoRoundCount),
  );

  generateEvent(`${args}`);
  const lotto = Lotto.deserialize(args);
  const winningNumbers: u8[] = generateUniqueRandomNumbers(1, 40, 5);

  lotto.winningNumbers.concat(winningNumbers);
  lotto.winners50.push(new Ticket('1', [1, 2, 3, 4, 5]));
  lotto.winners30.push(new Ticket('1', [1, 2, 3, 4, 5]));
  lotto.winners20.push(new Ticket('1', [1, 2, 3, 4, 5]));

  const ticketCount = u8.parse(Storage.get(TICKET_COUNT));

  if (ticketCount === 0) {
    generateEvent(`No tickets were sold in lottery round ${lottoRoundCount}`);
  } else {
    for (let i: u8 = 1; i <= ticketCount; i++) {
      if (Storage.has(TICKET_.concat(i.toString()))) {
        const args = Storage.get(
          TICKET_.concat(i.toString()),
        );
        const ticket = Ticket.deserialize(args);
        if (containsCount(winningNumbers, ticket.numbers, 5)) {
          lotto.winners50.push(ticket);
        } else if (containsCount(winningNumbers, ticket.numbers, 4)) {
          lotto.winners30.push(ticket);
        } else if (containsCount(winningNumbers, ticket.numbers, 3)) {
          lotto.winners20.push(ticket);
        }
      }
    }
  }

  Storage.set(
    stringToBytes(LOTTO_.concat(lottoRoundCount)),
    stringToBytes(lotto.serialize()),
  );

  generateEvent(`Cleaning ticket storage...`);
  // delete tickets from previous round
  for (let i: u8 = 1; i <= ticketCount; i++) {
    Storage.del(TICKET_.concat(i.toString()));
  }
  Storage.set(TICKET_COUNT, '0');
}

// @ts-ignore
@inline
function generateUniqueRandomNumbers(min: u8, max: u8, count: u8): u8[] {
  const numbers: Set<u8> = new Set();

  while (<u8>numbers.size < count) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    numbers.add(<u8>randomNum);
  }

  return numbers.values();
}

// @ts-ignore
@inline
function containsCount(a: u8[], b: u8[], c: u8): bool {
  let count: u8 = 0;

  const bSet = new Set<u8>();
  for (let i = 0; i < b.length; i++) {
    bSet.add(b[i]);
  }

  for (let i = 0; i < a.length; i++) {
    if (bSet.has(a[i])) {
      count++;
      if (count >= c) {
        return true;
      }
    }
  }

  return false;
}
