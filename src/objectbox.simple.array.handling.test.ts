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
test('Brute array handling detects array replcement.', () => {
  let array2 = [
    'one','two','three','four'
  ];
  obox.update({
    ar: array2
  })
  let chs: Change[] = obox.goBack();
  expect(chs.length===1);
  expect(chs[0].pointer).toEqual('.ar');
  expect(chs[0].previous).toEqual(array1);
  expect(chs[0].updated).toEqual(array2);
});
test('Brute array handling detects array expansion.', () => {
  array1.push('four');
  obox.update({
    ar: array1
  })
  let chs: Change[] = obox.goBack();
  expect(chs.length===1);
  expect(chs[0].pointer).toEqual('.ar');
  expect(chs[0].updated).toEqual(array1);
  expect(chs[0].previous).toEqual([
    'one','two','three'
  ])
});
test('Brute array handling detects array reduction.', () => {
  array1.pop();
  obox.update({
    ar: array1
  })
  let chs: Change[] = obox.goBack();
  expect(chs.length===1);
  expect(chs[0].pointer).toEqual('.ar');
  expect(chs[0].updated).toEqual(array1);
  expect(chs[0].previous).toEqual([
    'one','two','three'
  ])
});

test('Brute array handling detects element modification.', () => {
  array1[1] = 'nothing';
  obox.update({
    ar: array1
  })
  let chs: Change[] = obox.goBack();
  expect(chs.length===1);
  expect(chs[0].pointer).toEqual('.ar');
  expect(chs[0].updated).toEqual(array1);
  expect(chs[0].previous).toEqual([
    'one','two','three'
  ])
});