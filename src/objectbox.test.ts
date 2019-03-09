import { ObjectBox } from './objectbox';
import { Observable, Observer, of} from 'rxjs';

let ob: ObjectBox;

let testObservable: Observable<any> = of(1,2,3,4,5,6);

let datum1: any = null;
let datum2: any = null;
let obs1 = {
  next(datum: any) {
    datum1 = datum;
  },
  error: err => {}, complete: () => {}
}
let obs2 = {
  next(datum: any) {
    datum2 = datum;
  },
  error: err => {}, complete: () => {}
}

beforeEach(() => {
  ob = new ObjectBox();
  ob.setTarget({a: 'A', b: 'B'});
  ob.update({a: 'AAA'});
});
test('debounceField filter functions correctly.', ()=> {
  ob.attachDebounceFieldSource(testObservable);

})
test('Change is propagated to correct node of the target.', ()=> {
  expect(ob.cloneTargetData().a).toBe('AAA');
})
test('Multiple changes are propagated correctly.', ()=> {
  ob.update({
    a: 'NEW_A',
    b: 'NEW_B'
  });
  expect(ob.cloneTargetData().a).toBe('NEW_A');
  expect(ob.cloneTargetData().b).toBe('NEW_B');
})
test('Sequential updates are commited successfully to the target.', ()=> {
  ob.update({b: 'BB'});
  expect(ob.cloneTargetData().b).toBe('BB');
  ob.update({b: 'BBB'});
  expect(ob.cloneTargetData().b).toBe('BBB');
  ob.update({b: 'BBBB'});
  expect(ob.cloneTargetData().b).toBe('BBBB');
})

test('existsPreviousState() true after making at least one change.', () => {
  expect(ob.existsPreviousState()).toBe(true);
});
test('existsFutureState() false when at end of history queue.', () => {
  expect(ob.existsFutureState()).toBe(false);
});
test('existsPreviousState() false when at start of history queue.', () => {
  ob.goBack();
  expect(ob.existsPreviousState()).toBe(false);
});
test('existsFutureState() true when future changes exist.', () => {
  ob.goBack();
  expect(ob.existsFutureState()).toBe(true);
});


test('Changes are propagated to a subscriber', () => {
  ob.subscribeToChanges(obs1);
  let changes = ob.update( {a: 'A_NEW' } );
  expect(datum1).toBe(changes);
});
test('Changes are propagated to more than one subscriber', () => {
  ob.subscribeToChanges(obs1);
  ob.subscribeToChanges(obs2);
  let changes = ob.update( {a: 'A_NEW' } );
  expect(datum1).toBe(changes);
  expect(datum2).toBe(changes);
});
test('Changes are propagated on undo/goBack() and redo/goForward().', () => {
  ob.subscribeToChanges(obs1);
  ob.update( {a: 'A_NEW' } );
  let ch = ob.goBack();
  expect(datum1).toBe(ch);
  ch = ob.goForward();
  expect(datum1).toBe(ch);
});
test('Model modifications are propagated to a subscriber', () => {
  ob.subscribeToModelUpdates(obs1);
  ob.update( {a: 'A_NEW' } );
  expect(datum1.a).toBe('A_NEW');
});
test('Model modifications are propagated to more than one subscriber', () => {
  ob.subscribeToModelUpdates(obs1);
  ob.subscribeToModelUpdates(obs2);
  ob.update( {a: 'A_NEW' } );
  expect(datum1.a).toBe('A_NEW');
  expect(datum2.a).toBe('A_NEW');
});
test('Model modifications are propagated on undo/goBack() and redo/goForward().', () => {
  ob.subscribeToModelUpdates(obs1);
  ob.update( {a: 'A_NEW' } );
  let ch = ob.goBack();
  expect(datum1.a).toBe('AAA');
  ch = ob.goForward();
  expect(datum1.a).toBe('A_NEW');
});
test('Patch objects are propagated to a subscriber', () => {
  ob.subscribeToPatches(obs1);
  let update = {
    a: 'A_NEW',
    b: {
      b1: 'B1',
      b2: 'B2'
    }
  };
  ob.update(update);
  expect(datum1).toEqual(update);
});


test('Patch object is created correctly.', () => {
  ob.update({d: {
                d1: 'beforetest'
              }})
  let mod = {
    a: 'a1',
    c: {
      c1: 'test1',
      c2: 'test2'
    },
    d: {
      d2: 'test3'
    }
  }
  let original = ob.cloneTargetData();
  let result = ob.createPatchObject(mod, original);
  expect(result).toEqual(mod);
});