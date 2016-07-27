# Async Dispatcher
*A redux style Dispatcher that can handle asynchronous updates to its states*

Abstract out (and will soon be a dependency) of [isomorphic-dispatcher](https://github.com/nheyn/isomorphic-dispatcher), which is based off the [redux](https://github.com/rackt/redux/).

### Features
* The Dispatcher sends actions to multiple Stores
* Subscriber functions can be added to all of the Stores in the Dispatcher or just one
* Static Stores that allow object to passed as a store, for quick prototyping
* Redux Stores that allow redux style reducer function to passed as a store, for easier adoption and quick prototyping
* Stores can use any data structure for its state, as long as it is immutably
* Stores can use multiple Updater functions to mutate their state
* Each Updater function can return it's new state synchronously, or return a Promise for asynchronous updates
* Each Updater function is given plugins
  * getStoreName(): returns the name of Store given to the Dispatcher
  * getUpdaterIndex(): returns the index of the current Updater function in the Store
  * getUpdaterCount(): returns the number of Updater functions in the Store
  * pause(nextStatePromise): returned from Updater to keep Dispatcher from 'blocking' on long async calls
  * dispatch(currState, nextAction): returned from Updater dispatch an action from another updater
  * Stores can be given Middleware, to add additional plugins

### Dependencies
* ES2015(ES6) Promises
  * Used to handle asynchronous events, with standard javascript
  * An ES2015 compatible Promises library must be include as the global variable, Promise
* Immutable.js *internally used, not in public api*
  * Used for efficient immutable data structures

### Install
Async Dispatcher is hosted on npm, and can be installed using:

```
npm install --save async-dispatcher
```
### Usage
*Coming Soon*


### Documentation
Basic usage will be given above. More detailed documentation is before class/function definitions within the code.


### Tests
Test are written using [jest](https://facebook.github.io/jest/). Static type checking is done use [Flowtype](http://flowtype.org).
(__NOTE__, flow types are available by adding 'node_modules/async-dispatcher/type' to [libs] section of .flowconfig)

To perform static type check and the jest unit-tests, use:
```
cd <path to repo>
npm install
npm run test
```

### Example
There is a Todo List example, using async-dispatcher (and React), in the /example directory.

To start the example, use:
```
cd <path to repo>/example
npm install
npm start
```

