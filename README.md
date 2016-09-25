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

### Why not Redux?

__TL;DR;__
*Redux is a vary good idea, but the official implementation is too "theoretical"*

* Single function
  * Which contains
    * Initial state
    * Every action that can be performed
  * but not in practice
    * Complex initial state is moved to it own var
    * Many actions will be spit into multiple file
  * For each dispatcher
    * With single state
  * but not in practice
    * Combined using ```Lookup redux function name```
* No Async
  * Why async
    * Sync reducers can be performed async
    * Async can not be performed sync
  * There is a performance hit, but worth the flexibility
* Symptoms
  * Need a bunch of extras for simple implementation
    * Get normal middleware / helper modules
  * Function called a 'reducer'
    * Know by functional programmers
    * Doesn't make sense otherwise
      * "How do you reduce a state"
    * Really performs updates
  * Action creators
  * Link to async how-to
    * Rediculus how long it is
    * Show how simple it can be done
      * Return promise, built into ES2015


### Why async-dispatcher?

__TL;DR;__
*It is a more particle implementation of Redux*

* Async built in
  * Plug isomorphic-dispatcher
* Initial state is given when the store is create
  * State is separated from the updates
    * Like any complex state would end up being
  * Still allows synchronous access to state, and asynchronous updates
* Multiple updaters can be added
  * Each updater can focus on one update
    * Like any complex set of action will end up being
* Get State / Subscribe to proticluare store
  * Ignore the other states, not being used
    * Like any complex app will any way

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
##### Store
Stores keep track of the state for part of an application.

The state of Store can be mutated though updater functions. The function is sent the current state of the store and the action dispatched to the store. It should return the updated state, which can be in a Promise.
```
function updater(state, action) {
  // Update state for action
  //NOTE, do not mutate either argument

  return state;
});
```

Stores are created using the 'createStore' function, which takes the initial state of the Store as its argumenta.
```
var AsyncDispatcher = require('async-dispatcher');

var store  = AsyncDispatcher.createStore({
  initialState: {},
  updaters: [ updater ]
});
```


##### Dispatcher
Dispatchers keep track of a set of Stores.

Dispatchers are created using the 'createDispatcher' function, which takes a JS object with the Stores to use in the Dispatcher.
```
var dispatcher = AsyncDispatcher.createDispatcher({
  storeName: store
});
```

To update the states of the Stores use the 'dispatch' method.
Each action passed to the Dispatcher is dispatched to all of the Stores.
The returned value is a Promise that resolves after the given action finishes updating (resolves to the Dispatcher).
```
var action = { type: 'SOME_ACTION' };
dispatcher.dispatch(action).then(function() {
  // Perform any updates to do after the given action finishes dispatching
});
```

To get the state of a Store use the 'getStateFor' method.
```
var state = dispatcher.getStateFor('storeName');
```

Use the 'subscribeTo' method to add to subscribe to the changes in a single Stores.
The subscriber will be passed the updated state for the given Store.
It returns a function that will, when called, unsubscribe the subscriber.
```
// Subscribe to 'storeName'
var unsubscribe = dispatcher.subscribeTo('storeName', function(updatedState) {
   // Perform updates for new state
});

// Unsubscribe from 'storeName'
unsubscribe();
```

### Tests
Test are written using [jest](https://facebook.github.io/jest/). Static type checking is done use [Flowtype](http://flowtype.org).
(__NOTE__, flow types are available by adding 'node_modules/async-dispatcher/type.js' to [libs] section of .flowconfig)

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

### Documentation
Basic usage is given above. More detailed documentation is before class/function definitions within the code.
