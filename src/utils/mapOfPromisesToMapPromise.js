/*
 * @flow
 */
import Immutable from 'immutable';

type MapOfPromises<T> = Immutable.Map<string, Promise<T>>;
type MapPromise<T> = Promise<Immutable.Map<string, T>>;

/**
 * Turns a map that contains promises into a promises that resovles to map that contains the values resolved by
 * the promises in the given map.
 *
 * @param promises  {Map<Promise>}  The map to resolve the promise that it contains
 *
 * @return          {Promise<Map>}  A promise that contains a map with the results from the given promises
 */
export default function mapOfPromisesToMapPromise<T>(promises: MapOfPromises<T>): MapPromise<T> {
  // Get promises map as an array
  let keys = [];
  let promiseArray = [];
  const promisesObject = promises.toObject();
  for(let name in promisesObject) {
    const currPromise = promisesObject[name];

    keys.push(name);
    promiseArray.push(currPromise);
  }

  // Wait for all promises to finish
  return Promise.all(promiseArray).then((resultArray) => {
    // Get array of results as a map
    let resultsObject = {};
    keys.forEach((resultName, i) => {
      resultsObject[resultName] = resultArray[i];
    });

    return Immutable.Map(resultsObject);
  });
}