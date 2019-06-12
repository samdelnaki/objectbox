import { ObjectBox } from './objectbox';
import { Observable, Observer, of} from 'rxjs';
import { Change } from './change';


let obox: ObjectBox;
let array1 = [
  'one','two','three'
];

beforeEach(() => {
  obox = new ObjectBox();
  obox.setTarget({ar: array1});
});


test('Brute array change detection correctly array replcement.', () => {
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
test('Brute array change detection correctly array expansion.', () => {
  array1.push('four');
  obox.update({
    ar: array1
  })
  let chs: Change[] = obox.goBack();
  expect(chs.length===1);
  expect(chs[0].pointer).toEqual('.ar');
  expect(chs[0].previous).toEqual(array1);
});