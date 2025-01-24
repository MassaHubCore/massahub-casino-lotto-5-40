import { Ticket } from './Ticket';
import { Args, Result, Serializable } from '@massalabs/as-types';

export class Lotto implements Serializable {
  public winningNumbers: u8[] = [];
  public winners50: Ticket[] = [];
  public winners30: Ticket[] = [];
  public winners20: Ticket[] = [];

  constructor(
    public round: u64 = 0,
    public startDate: u64 = 0,
    public endDate: u64 = 0,
    public deposit: u64 = 0,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.round)
      .add(this.startDate)
      .add(this.endDate)
      .add(this.deposit)
      .add(this.winningNumbers)
      .addSerializableObjectArray(this.winners50)
      .addSerializableObjectArray(this.winners30)
      .addSerializableObjectArray(this.winners20)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.round = args.nextU8().expect('Missing lotto round');
    this.startDate = args.nextU64().expect('Missing lotto start date');
    this.endDate = args.nextU64().expect('Missing lotto end date');
    this.deposit = args.nextU64().expect('Missing lotto deposit');
    this.winningNumbers = args
      .nextFixedSizeArray<u8>()
      .expect('Missing lotto winning numbers');
    this.winners50 = args
      .nextSerializableObjectArray<Ticket>()
      .expect('Missing lotto winners 50');
    this.winners30 = args
      .nextSerializableObjectArray<Ticket>()
      .expect('Missing lotto winners 30');
    this.winners20 = args
      .nextSerializableObjectArray<Ticket>()
      .expect('Missing lotto winners 20');

    return new Result(args.offset);
  }
}
