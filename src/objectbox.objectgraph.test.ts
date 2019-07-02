import { ObjectBox } from './objectbox';

let obox: ObjectBox;

beforeEach(() => {
  obox = new ObjectBox(
    {
      a: {
        x: 'x',
        y: 'y',
        z: {
          one: 1,
          two: 2,
          three: 3
        }
      },
      b: {
        first: [
          {
            color: 'red',
            size: 'big'
          },
          {
            color: 'blue',
            size: 'medium'
          }
        ],
        second: [
          {
            color: 'yellow',
            size: 'little'
          },
          {
            color: 'green',
            size: 'tiny'
          }
        ]
      }
    });
});

test('Successfully updates elements at more than one level of depth.', () => {
  let delta = {
    a: {
      z: {
        one: 'new-value'
      }
    }
  };
  obox.update(delta);
  let obj = obox.cloneTargetData();
  expect(obj.a.z.one).toEqual(delta.a.z.one);
});