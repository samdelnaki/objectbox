import { ObjectBox } from './objectbox';
import { Change } from './change';

let obox: ObjectBox;
let array1 = []

beforeEach(() => {
  array1  = [
    'one','two','three'
  ];
  obox = new ObjectBox(
    {
      ar: array1
    },
    {
      arrayHandling: 'smart'
    });
});

test('Smart array handling detects element modification.', () => {
  let array2 = [
    'one','different','three'
  ];
  obox.update({
    ar: array2
  })
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});



test('Smart array handling detects element insertion at end of array.', () => {
  let array2 = [
    'one','two','three','more'
  ];
  obox.update({
    ar: array2
  })
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});