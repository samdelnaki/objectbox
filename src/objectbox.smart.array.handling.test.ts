import { ObjectBox } from './objectbox';
import { Change } from './change';

let obox: ObjectBox;
let array1 = []

beforeEach(() => {
  array1  = [
    'one','two','three'
  ];
  obox = new ObjectBox();
  obox.setTarget({ar: array1});
});

test('Array node is updated correctly.', () => {
  let array2 = [
    'one','two','three','four'
  ];
  obox.update({
    ar: array2
  })
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});