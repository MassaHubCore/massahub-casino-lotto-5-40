import { Args, Result, Serializable } from '@massalabs/as-types';

export class Ticket implements Serializable {
  constructor(public address: string = '', public numbers: u8[] = []) {}

  serialize(): StaticArray<u8> {
    return new Args().add(this.address).add(this.numbers).serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.address = args.nextString().expect('Missing ticket address');
    this.numbers = args
      .nextFixedSizeArray<u8>()
      .expect('Missing ticket numbers');

    return new Result(args.offset);
  }
}
