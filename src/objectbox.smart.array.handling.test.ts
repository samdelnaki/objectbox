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
test('Smart array handling detects element insertion at start of array.', () => {
  let array2 = [
    'more','one','two','three'
  ];
  obox.update({
    ar: array2
  })
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});
test('Smart array handling detects element insertion neither at start nor end of array.', () => {
  let array2 = [
    'one','two','more','three'
  ];
  obox.update({
    ar: array2
  })
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});
test('Smart array handling detects multiple insertions.', () => {
  let array2 = [
    'one','insert-a','two','insert-b','three'
  ];
  obox.update({
    ar: array2
  })
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});
test('Smart array handling detects insertion of multiple contiguous elements.', () => {
  let array2 = [
    'one','insert-a','insert-b','two','three'
  ];
  obox.update({
    ar: array2
  })
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});
test('Smart array handling detects multiple insertions of contiguous elements.', () => {
  let array2 = [
    'one','insert-a','insert-b','two', 'insert-x', 'insert-y', 'insert-z', 'three'
  ];
  obox.update({
    ar: array2
  })
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});
