<a href="https://promisesaplus.com/">
  <img src="http://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo"
       title="Promises/A+ 1.0 compliant" align="right" />
</a>

# Lifelong.Promise for Typescript

This implements the [Promises/A+ specification](https://github.com/promises-aplus/promises-spec) in a single, very strongly typed Typescript file, without extraneous identifiers.


## Why This Library

Lifelong provides the strongest typing for Promises, which is one of Typescript's major selling points.  Its `.d.ts` header file is clear and easy to follow, with no extraneous names or concepts.  Its 'on next tick / on next event loop' function is configurable.  Its Promise class can be subclassed, where each subclass can use a different nextTick function.  And it's small: a single file, a single class, and an optional interface.

Lifelong does not require any other library.

A pre-made `ajax` call is included for convenience and for example usage.

Two ways of starting a promise chain exist.  For an object-oriented style of coding, call `beginChain` without arguments for a `deferred`.  For a functional style of coding, call `beginChain` with a function accepting two library-supplied functions, fulfill and reject, for the first promise.


### What are Promises, Chains, and Deferreds?

A _promise_ _library_ sits under framework code and above app code, right where an async callback leaves the framework and enters the app. It wraps the app's callbacks so they can use `return` and `throw` keywords for a more normal style of coding. It also gives lower-level app code something to return to mid-level app code, so the lower levels needn't solicit callback functions from the mid-level.

A _promise_ "wraps the eventual return value of an async call."  Its `then(..)` method attaches the app's callbacks for when the value finally becomes available.

A promise awaiting the return value it is said to be _unresolved_.  Once the value arrives it is _fulfilled_.  If something goes wrong it is _rejected_.  Hence _resolved_ means either fulfilled or rejected.  Transitioning to a resolved status is one-way, one-time, and permanent.

`then(..)` also returns a new promise which can also be then'ed, creating a _chain_ of promises, each of which uses the return value of the previous.

If placed in a variable, the same promise can be then'ed multiple times so each of its children will get the same input. A _promise_ _chain_ is a tree of promises with a _deferred_ at the root.

A _deferred_ "represents an operation that will finish later."  Deferreds have only three properties: a first `promise` on which other promises hang, and methods `resolve` and `reject` to be called by outside code when the return value becomes available, to resolve that first promise and thereby lighting up the whole tree.

### How to Use

The .d.ts file is kept clean for easy use, though it lacks any documentation.  

Any Typescript Promise that isn't at least as specific as `Promise<T>` may not be worth using unless a very old version of Typescript is forced upon you.

#### Public Instanced Methods

`then<R>(onFulfilled?: (input: T) => R, onRejected?: (error: T) => R): Promise<R>`

The heart of any Promise implementation is this.  Note that `Promise<T>.then()` creates a `Promise<R>`, not another `Promise<T>`.  This is due to the app's callbacks having the ability to transform the returned value.

`catch<R>(onRejected: (error: T) => R): Promise<R>`

Equivalent to `.then(undefined, fn)` but that does not imply `.then(fn1, fn2)` is equivalent to `.then(fn1).catch(fn2)`. The latter case will send any exception thrown from within `fn1` into `fn2`, while in the former `fn2` will be skipped over and the exception lands in the next catch.

#### Public Static Methods

`static ajax(url: string, payload?: any): Promise<string>`

Most of the usage of Promises is calling a server from javascript. This also serves as an example of how to use the Deferred interface object for anyone new to Promises. 

```
static beginChain<T>(): Deferred<T, T>
static beginChain<T>(resolvePromise: (toFulfill: (value: T) => void, toReject: (error: T) => void) => void): Promise<T>
```

`beginChain` is how to create a promise from nothing.  Call without parameters for a Deferred object, detailed below.  Call with a function to get the promise directly, accepting two functions to fulfill or reject it when the time comes, like so: 

```typescript
static ajax(url: string, payload?: any): Promise<string> {
    return Promise.beginChain<string>((fulfiller, rejecter) => {
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200)
                    fulfiller(xhr.response);
                else
                    rejecter(xhr.response);
            }
        };
        xhr.open(payload ? "POST" : "GET", url, true);
        xhr.send(payload);
    });
```

`static fulfilled<T>(value: T | Promise<T>): Promise<T>`

This creates a new, resolved promise which is fulfilled.  Passing it a promise merely returns the same promise back to you, unchanged. Any `then`ed callbacks won't run until the next event cycle.

`static rejected<T>(error: T): Promise<T>`

Similarly, this creates a new, resolved  promise which is rejected. 

`static nextTickFn: <T>(setTimeoutOrSimilarFn: Function, caller: Promise<T>) => void`

How does Lifelong.Promise know how to schedule a function for the next event cycle?  By default, it uses ```setTimeout(fn,0)``` but this static property can change that with a simple `Promise.nextTickFn = myFunc`.  The requesting promise is passed in as a convenience, in case there are multiple subclasses of Promise and they differ on what counts as a next cycle.

`static all<T>(promises: Array<Promise<T>>): Promise<Array<T>>`

Making several server calls in parallel is easy, but to `then` after all of their promises are resolved requires this function. If any reject, `all` immediately rejects.

```typescript
    var content2 = document.getElementById("content2");
    content2.innerHTML = "Loading all...";
    
    var promises = [1, 2, 3].map(_ => Lifelong.Promise.ajax("http://localhost/API/Values/get"));
    
    Lifelong.Promise.all(promises)
      .then(_ => content2.innerHTML = "all done")
      .catch(_ => content2.innerHTML = "at least one errored");
```

#### Interface Deferred

If a tree of promises have class Promise as its nodes, then class Deferred is the arcs between them.  Specifically, it's the arc _preceding_ the node.  Even the root node is preceded by a deferred.

```typescript
interface Deferred<T, R> {
    resolve: (input: T) => R;
    reject: (error: T) => R;
    promise: Promise<R>;
}
```

When returned from `beginChain`, all three of these fields are filled in already, and `T` == `R`. Use and return `promise` to attach `then` methods and go from there.  When the value that the promise awaits becomes available, call `resolve`. Only call `reject` on error.

#### Protected Methods

`protected constructor()`

Use `beginChain` to create a new promise. 

```typescript
protected status: "unresolved" | "FULFILLED" | "REJECTED"
protected outcome: T
protected queue: Deferred<T, any>[]

protected fulfill(x: T): Promise<T>
protected reject(error: T): Promise<T>
```

These two functions merely set these first two properties, then loop through the queue calling their half of the callbacks. 

`protected static Resolve<T>(promise: Promise<T>, x: T): Promise<T>`

The real heart of the Promise/A+ spec has around 400 unit tests and is a bear to get just right.



### Examples

At its most basic, Promises turn
```callServer(value1, value2, onSuccess)```
into
```return callServer(value1, value2)```
with onSuccess staying at the higher level code, in a `then` hanging on the return value.

#### Using the included ajax call in a test project

```typescript
var content = document.getElementById("out");

Lifelong.Promise.ajax("http://localhost/WebAPI/Alive/get")
	.then(x => content.innerHTML = x)
	.catch(e => content.innerHTML = "<h1>Server problem</h1>" + e);
```

#### Layers

Since Typescript's tagline is "Javascript that scales," it's likely the front-end will be large enough that some layering, however thin, is in order.

The included ajax method isn't intended to cover the myriad needs of real apps, but it usually suffices for small projects and examples.

The bottom layer is the ajax call itself.  It makes no assumptions about what the server returns or where the server is at.
```typescript
function callServer(url: string): Promise<string> {
    return Promise.ajax(url);
}
```
The next layer up might find-tune urls based on the desired service, and turn the server's JSON string into a javascript datatype.  It wouldn't be used for that one weird XML call in the app.
```typescript
function fromJSON(service:string): Promise<any> {
    return callServer(BaseUrl+"/"+type)
		.then(s => JSON.parse(s));
}
```
The next layer up might reify returned objects, turning Typescript's "concrete interfaces" into actual classes with working methods.  Server calls that return primitive values like number or boolean would opt out at this point.
```typescript
function get<T>(ctor: {new():T}): Promise<T> {
	var service = getServiceName(ctor);
	return fromJSON(service).then(obj => {
		var retval:T = new ctor();
		copyPropertiesFromTo(obj, retval);
		return retval;
	});
}
```
The model of a model-view-controller arrangement -- or whatever the app's conceptual nouns are -- begins the high-level layer of app code.  Models generally shouldn't contain any logic except 'self-obsessed' functions like cost() here, but REST methods begin to qualify when their input parameters don't ask for callback functions.
```typescript
public class Invoice {
	invoiceID: number;
    orderID: number;
    lineItems: InvoiceLineItem[];

    static load(invoiceId: number): Promise<Invoice> {
		return get<Invoice>(Invoice);
	}

	cost(): number {
		return this.lineItems.reduce((sum,each) => sum + each.cost, 0);
	}
}
```
The code behind the HTML tops this cake.  It tells the model to load itself, and what to do with itself once loaded.
```typescript
	constructor(id:number) {
		Invoice.load(id).then(invoice => {
			document.getElementById("cost").innerHTML = invoice.cost();
		});
	}
```

#### Example of a Deferred

The included ```Promise.ajax()``` method uses a Deferred to promise-ify ```xhr```.

```typescript
static ajax(url: string, payload?: any): Promise<string> {
  let deferred = Promise.beginChain<string>();
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = () => {
		if (xhr.readyState === 4) {
			if (xhr.status === 200)
				deferred.resolve(xhr.response);
      else
        deferred.reject(xhr.response);
    }
	};
	xhr.open(payload ? "POST" : "GET", url, true);
	xhr.send(payload);
	return deferred.promise;
}
```


