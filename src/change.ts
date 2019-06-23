export class Change {
  pointer: string; 
  previous: any; 
  updated: any
  constructor(pointer: string = null, previous: any = null, updated: any = null) {
    this.pointer = pointer;
    this.previous = previous;
    this.updated = updated;
  }
};

export class ArrayChange extends Change {
  type: 'insert'|'modify'|'delete';
}