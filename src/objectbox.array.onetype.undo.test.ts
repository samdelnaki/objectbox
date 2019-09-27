import { ObjectBox } from './objectbox';

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

test('One type modification can undo single index modification.', () => {
  let array2 = [
    'one','different','three'
  ];
  obox.update({
    ar: array2
  })
  let changes = obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array1);
});


test('Smart array handling can undo element insertion at end of array.', () => {
  let array2 = [
    'one','two','three','more'
  ];
  obox.update({
    ar: array2
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array1);
});
test('Smart array handling can undo element insertion at start of array.', () => {
  let array2 = [
    'more','one','two','three'
  ];
  obox.update({
    ar: array2
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array1);
});

test('Smart array handling can undo element insertion neither at start nor end of array.', () => {
  let array2 = [
    'one','two','more','three'
  ];
  obox.update({
    ar: array2
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array1);
});
test('Smart array handling can undo multiple insertions.', () => {
  let array2 = [
    'one','insert-a','two','insert-b','three'
  ];
  obox.update({
    ar: array2
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array1);
});
test('Smart array handling can undo insertion of multiple contiguous elements.', () => {
  let array2 = [
    'one','insert-a','insert-b','two','three'
  ];
  obox.update({
    ar: array2
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array1);
});
test('Smart array handling can undo multiple insertions of contiguous elements.', () => {
  let array2 = [
    'one','insert-a','insert-b','two', 'insert-x', 'insert-y', 'insert-z', 'three', 'insert-m', 'insert-n', 'insert-o'
  ];
  obox.update({
    ar: array2
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array1);
});

test('Smart array handling can undo deletion of single element.', () => {
  let array2 = [
    'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'
  ];
  obox.update({
    ar: array2
  })
  let array3 = JSON.parse(JSON.stringify(array2));
  array3.splice(4,1);
  obox.update({
    ar: array3
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});
test('Smart array handling can undo multiple deletions.', () => {
  let array2 = [
    'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'
  ];
  obox.update({
    ar: array2
  });
  let array3 = [
    'one','two','four','five','seven','eight','ten','eleven','twelve'
  ];
  obox.update({
    ar: array3
  });
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});
test('Smart array handling can undo deletion of multiple contiguous elements.', () => {
  let array2 = [
    'three'
  ];
  obox.update({
    ar: array2
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array1);
});

test('Smart array handling can undo multiple deletions of contiguous elements.', () => {
  let array2 = [
    'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'
  ];
  obox.update({
    ar: array2
  })
  let array3 = [
    'one','two','five','six','ten','eleven','twelve'
  ];
  obox.update({
    ar: array3
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});

test('Smart array handling can undo deletion of first element in array.', () => {
  let array2 = [
    'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'
  ];
  obox.update({
    ar: array2
  })
  let array3 = JSON.parse(JSON.stringify(array2));
  array3.splice(0,1);
  obox.update({
    ar: array3
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});
test('Smart array handling can undo deletion of last element in array.', () => {
  let array2 = [
    'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'
  ];
  obox.update({
    ar: array2
  })
  let array3 = JSON.parse(JSON.stringify(array2));
  array3.splice(array3.length-1,1);
  obox.update({
    ar: array3
  })
  obox.goBack();
  let obj = obox.cloneTargetData();
  expect(obj.ar).toEqual(array2);
});

