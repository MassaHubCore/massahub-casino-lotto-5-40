import { Context, generateEvent, Storage } from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { setOwner } from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import { LOTTO_, LOTTO_ROUND_COUNT, TICKET_, TICKET_COUNT } from './utils/tags';
import { Lotto } from './serializable/Lotto';
import { Ticket } from './serializable/Ticket';
import { bytesToString } from '@massalabs/as-types/assembly/serialization/strings';

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract());

  setOwner(new Args().add(Context.caller()).serialize());

  Storage.set(LOTTO_ROUND_COUNT, stringToBytes('1'));
  Storage.set(TICKET_COUNT, stringToBytes('0'));
  initLotto();
}

export function getCurrentLotto(): StaticArray<u8> {
  const lottoRoundCount = bytesToString(Storage.get(LOTTO_ROUND_COUNT));
  return Storage.get(stringToBytes(LOTTO_.concat(lottoRoundCount.toString())));
}

function initLotto(): void {
  const lottoRoundCount = bytesToString(Storage.get(LOTTO_ROUND_COUNT));
  const newLottoCount = u64.parse(lottoRoundCount) + 1;
  Storage.set(LOTTO_ROUND_COUNT, stringToBytes(newLottoCount.toString()));

  const lotto = new Lotto(newLottoCount, 0, 0, 0);

  Storage.set(
    stringToBytes(LOTTO_.concat(newLottoCount.toString())),
    lotto.serialize(),
  );

  generateEvent(`lottery round ${newLottoCount} begins`);
  finalizeLotto();
}

function finalizeLotto(): void {
  const lottoRoundCount = bytesToString(Storage.get(LOTTO_ROUND_COUNT));
  generateEvent(
    `Lottery round ${lottoRoundCount} is over, we start drawing the winning numbers`,
  );

  const lottoArgs = Storage.get(
    stringToBytes(LOTTO_.concat(lottoRoundCount.toString())),
  );

  const lotto = new Args(lottoArgs).nextSerializable<Lotto>().unwrap();

  const winningNumbers: u8[] = generateUniqueRandomNumbers(1, 40, 5);

  lotto.winningNumbers = winningNumbers;

  const ticketCount = u8.parse(bytesToString(Storage.get(TICKET_COUNT)));

  if (ticketCount === 0) {
    generateEvent(`No tickets were sold in lottery round ${lottoRoundCount}`);
  } else {
    for (let i: u8 = 1; i <= ticketCount; i++) {
      if (Storage.has(TICKET_.concat(i.toString()))) {
        const ticketArgs = Storage.get(
          stringToBytes(TICKET_.concat(i.toString())),
        );
        const ticket = new Args(ticketArgs).nextSerializable<Ticket>().unwrap();
        if (containsCount(winningNumbers, ticket.numbers, 5)) {
          lotto.winners50.push(ticket);
        } else if (containsCount(winningNumbers, ticket.numbers, 4)) {
          lotto.winners30.push(ticket);
        } else if (containsCount(winningNumbers, ticket.numbers, 3)) {
          lotto.winners20.push(ticket);
        }
      }

      Storage.set(
        stringToBytes(LOTTO_.concat(lottoRoundCount.toString())),
        lotto.serialize(),
      );
    }

    // delete tickets from previous round
    for (let i: u8 = 1; i <= ticketCount; i++) {
      Storage.del(TICKET_.concat(i.toString()));
    }
    Storage.set(TICKET_COUNT, stringToBytes('0'));
  }
}

function generateUniqueRandomNumbers(min: u8, max: u8, count: u8): u8[] {
  const numbers: Set<u8> = new Set();

  while (<u8>numbers.size < count) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    numbers.add(<u8>randomNum);
  }

  return numbers.values();
}

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
