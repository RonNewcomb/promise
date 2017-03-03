// this version has an 'adapter' section appended to the bottom for unit testing purposes

module Lifelong {
    'use strict';

    export class Promise<T> {

        // public methods /////////////////////////////////////////

        then<R>(onFulfilled?: (input: T) => R, onRejected?: (error: T) => R): Promise<R> {
            switch (this.status) {

                case "unresolved":
                    var promise2a = new Promise<R>();
                    this.queue.push(<Deferred<T,R>>{ promise: promise2a, resolve: onFulfilled, reject: onRejected });
                    return promise2a;

                case "FULFILLED":
                    if (typeof onFulfilled !== 'function') 
                        return <any>this;
                    var promise2a = new Promise<R>();
                    Promise.nextTickFn(() => { // lambda to capture 'this'
                        try {
                            Promise.Resolve(promise2a, onFulfilled(this.outcome));
                        } catch (e) {
                            promise2a.reject(e);
                        }
                    }, this);
                    return promise2a;

                case "REJECTED":
                    if (typeof onRejected !== 'function')
                        return <any>this;
                    var promise2a = new Promise<R>();
                    Promise.nextTickFn(() => { // lambda to capture 'this'
                        try {
                            Promise.Resolve(promise2a, onRejected(this.outcome));
                        } catch (e) {
                            promise2a.reject(e);
                        }
                    }, this);
                    return promise2a;
            }
        }

        catch<R>(onRejected: (error: T) => R): Promise<R> {
            return this.then(undefined, onRejected);
        }

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


        // configuration
        static nextTickFn: <T>(setTimeoutOrSimilarFn: Function, caller: Promise<T>) => void = (setTimeoutOrSimilarFn: Function) => setTimeout(setTimeoutOrSimilarFn, 0);

        // pending ctor
        static beginChain<T>(): Deferred<T, T>;
        static beginChain<T>(resolvePromise: (toFulfill: (value: T) => void, toReject: (error: T) => void) => void): Promise<T>;
        static beginChain<T>(resolvePromise?: (toFulfill: (value: T) => void, toReject: (error: T) => void) => void): Promise<T> | Deferred<T, T> {
            var p = new Promise<T>();
            if (!resolvePromise)
                return <Deferred<T, T>>{
                    resolve: x => Promise.Resolve(p, x).outcome,
                    reject: e => p.reject(e).outcome,
                    promise: p,
                };
            try {
                resolvePromise(x => Promise.Resolve(p, x), e => p.reject(e));
                return p;
            }
            catch (e) {
                return p.reject(e);
            }
        }

        // success ctor
        static fulfilled<T>(value: T | Promise<T>): Promise<T> {
            return (value instanceof Promise) ? value : new Promise<T>().fulfill(value);
        }

        // failure ctor
        static rejected<T>(error: T): Promise<T> {
            return new Promise<T>().reject(error);
        }

        static all<T>(promises: Array<Promise<T>>): Promise<Array<T>> {

            if (!promises.length)
                return Promise.fulfilled([]);

            var called = false;
            var numResolved = 0;
            var returnedArray = new Array<T>(promises.length);
            var returnedPromise = new Promise<Array<T>>();
            var i = 0;

            for (var eachPromise of promises) {
                Promise.fulfilled(eachPromise).then((val:T) => {
                    returnedArray[i] = val;
                    if (++numResolved === promises.length && !called) {
                        called = true;
                        Promise.Resolve(returnedPromise, returnedArray);
                    }
                }, error => {
                    if (!called) {
                        called = true;
                        returnedPromise.reject([error]);
                    }
                });
                i++;
            }

            return returnedPromise;
        }



        /// protected helpers ///////////////////////////////////////////////////////

        protected constructor() {}
        protected status: "unresolved" | "FULFILLED" | "REJECTED" = "unresolved";
        protected outcome: T;
        protected queue: Deferred<T,any>[] = [];

        protected fulfill(x: T): Promise<T> {
            this.status = "FULFILLED";
            this.outcome = x;
            this.queue.forEach(deferred => {
                if (typeof deferred.resolve !== 'function')// If onFulfilled is not a function, it must be ignored
                    deferred.promise.fulfill(x);    // If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value as promise1
                else
                    Promise.nextTickFn((): void => {
                        try {
                            Promise.Resolve(deferred.promise, deferred.resolve(x));
                        } catch (e) {
                            deferred.promise.reject(e);
                        }
                    }, deferred.promise);
            });
            return this;
        }

        protected reject(error: T): Promise<T> {
            this.status = "REJECTED";
            this.outcome = error;
            this.queue.forEach(deferred => {
                if (typeof deferred.reject !== 'function') // If onRejected is not a function, it must be ignored
                    deferred.promise.reject(error);// If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same value as promise1
                else
                    Promise.nextTickFn((): void => {
                        try {
                            Promise.Resolve(deferred.promise, deferred.reject(error));
                        } catch (e) {
                            deferred.promise.reject(e);
                        }
                    }, deferred.promise);
            });
            return this;
        }

        // The Promise Resolution Procedure  [[Resolve]](promise, x) /////////////
        protected static Resolve<T>(promise: Promise<T>, x: T): Promise<T> {
            try {
                // If promise and x refer to the same object, reject promise with a TypeError as the reason.
                if (<any>x === <any>promise)
                    return promise.reject(<any>new TypeError('Cannot resolve promise with itself'));

                // If x is not an object or function, fulfill promise with x
                if (!x || (typeof x !== "object" && typeof x !== "function"))
                    return promise.fulfill(x);

                // If x is a promise, adopt its state
                // Let thenFn be x.then
                // If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason
                var thenFn = x && (x as T & { then?: Function }).then;

                // If thenFn is not a function, fulfill promise with x.  (x isn't a promise.)
                if (typeof thenFn !== "function")
                    return promise.fulfill(x);

                // If multiple calls to resolvePromise/rejectPromise are made, ignore all but the first call.
                // If calling thenFn throws an exception e, and resolvePromise or rejectPromise have been called already, ignore the exception.
                var alreadyCalled = false;

                // With first argument resolvePromise, where if/when resolvePromise is called with a value y, run [[Resolve]](promise, y),
                var resolvePromise = function (value: T) {
                    if (alreadyCalled) return;
                    alreadyCalled = true;
                    Promise.Resolve(promise, value);
                }

                // and with second argument rejectPromise, where if/when rejectPromise is called with a reason r, reject promise with r,
                var rejectPromise = function (r: Error) {
                    if (alreadyCalled) return;
                    alreadyCalled = true;
                    promise.reject(<any>r);
                }

                try {
                    // call thenFn with x as 'this'.
                    thenFn.apply(x, [resolvePromise, rejectPromise]); // (do not return this value)
                }
                catch (e) {
                    rejectPromise(e);
                }
                return promise;
            } catch (e) {
                // Otherwise, reject promise with e as the reason.
                return promise.reject(e);
            }
        }


    }// end class Promise ////////////////////////////////////////////

   
    export interface Deferred<T, R> {
        resolve: (input: T) => R;
        reject: (error: T) => R;
        promise: Promise<R>;
    }

}

/// unit testing only /////
declare var global: any;
global.adapter = {
    deferred: function <T>() { return Lifelong.Promise.beginChain<T>(); },
    resolved: function <T>(val: T): Lifelong.Promise<T> { return Lifelong.Promise.fulfilled(val); },
    rejected: function <T>(reason: T): Lifelong.Promise<T> { return Lifelong.Promise.rejected(reason); },
};
