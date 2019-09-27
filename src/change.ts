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
  type: 'insert'|'set'|'delete';
  constructor(pointer: string = null, previous: any = null, updated: any = null, type: 'insert'|'set'|'delete') {
    super(pointer, previous, updated);
    this.type = type;
  }
}

export class LogicChange extends Change {
  constructor(pointer: string = null, previous: any = null, updated: any = null) {
    super(pointer, previous, updated);
  }  
}