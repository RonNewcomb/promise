var Lifelong;
(function (Lifelong) {
    'use strict';
    var Promise = (function () {
        function Promise() {
            this.status = "unresolved";
            this.queue = [];
        }
        Promise.prototype.then = function (onFulfilled, onRejected) {
            var _this = this;
            switch (this.status) {
                case "unresolved":
                    var promise2a = new Promise();
                    this.queue.push({ promise: promise2a, resolve: onFulfilled, reject: onRejected });
                    return promise2a;
                case "FULFILLED":
                    if (typeof onFulfilled !== 'function')
                        return this;
                    var promise2a = new Promise();
                    Promise.nextTickFn(function () {
                        try {
                            Promise.Resolve(promise2a, onFulfilled(_this.outcome));
                        }
                        catch (e) {
                            promise2a.reject(e);
                        }
                    }, this);
                    return promise2a;
                case "REJECTED":
                    if (typeof onRejected !== 'function')
                        return this;
                    var promise2a = new Promise();
                    Promise.nextTickFn(function () {
                        try {
                            Promise.Resolve(promise2a, onRejected(_this.outcome));
                        }
                        catch (e) {
                            promise2a.reject(e);
                        }
                    }, this);
                    return promise2a;
            }
        };
        Promise.prototype.catch = function (onRejected) {
            return this.then(undefined, onRejected);
        };
        Promise.ajax = function (url, payload) {
            var deferred = Promise.beginChain();
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
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
        };
        Promise.beginChain = function (resolvePromise) {
            var p = new Promise();
            if (!resolvePromise)
                return {
                    resolve: function (x) { return Promise.Resolve(p, x).outcome; },
                    reject: function (e) { return p.reject(e).outcome; },
                    promise: p,
                };
            try {
                resolvePromise(function (x) { return Promise.Resolve(p, x); }, function (e) { return p.reject(e); });
                return p;
            }
            catch (e) {
                return p.reject(e);
            }
        };
        Promise.fulfilled = function (value) {
            return (value instanceof Promise) ? value : new Promise().fulfill(value);
        };
        Promise.rejected = function (error) {
            return new Promise().reject(error);
        };
        Promise.all = function (promises) {
            if (!promises.length)
                return Promise.fulfilled([]);
            var called = false;
            var numResolved = 0;
            var returnedArray = new Array(promises.length);
            var returnedPromise = new Promise();
            var i = 0;
            for (var _i = 0, promises_1 = promises; _i < promises_1.length; _i++) {
                var eachPromise = promises_1[_i];
                Promise.fulfilled(eachPromise).then(function (val) {
                    returnedArray[i] = val;
                    if (++numResolved === promises.length && !called) {
                        called = true;
                        Promise.Resolve(returnedPromise, returnedArray);
                    }
                }, function (error) {
                    if (!called) {
                        called = true;
                        returnedPromise.reject([error]);
                    }
                });
                i++;
            }
            return returnedPromise;
        };
        Promise.prototype.fulfill = function (x) {
            this.status = "FULFILLED";
            this.outcome = x;
            this.queue.forEach(function (deferred) {
                if (typeof deferred.resolve !== 'function')
                    deferred.promise.fulfill(x);
                else
                    Promise.nextTickFn(function () {
                        try {
                            Promise.Resolve(deferred.promise, deferred.resolve(x));
                        }
                        catch (e) {
                            deferred.promise.reject(e);
                        }
                    }, deferred.promise);
            });
            return this;
        };
        Promise.prototype.reject = function (error) {
            this.status = "REJECTED";
            this.outcome = error;
            this.queue.forEach(function (deferred) {
                if (typeof deferred.reject !== 'function')
                    deferred.promise.reject(error);
                else
                    Promise.nextTickFn(function () {
                        try {
                            Promise.Resolve(deferred.promise, deferred.reject(error));
                        }
                        catch (e) {
                            deferred.promise.reject(e);
                        }
                    }, deferred.promise);
            });
            return this;
        };
        Promise.Resolve = function (promise, x) {
            try {
                if (x === promise)
                    return promise.reject(new TypeError('Cannot resolve promise with itself'));
                if (!x || (typeof x !== "object" && typeof x !== "function"))
                    return promise.fulfill(x);
                var thenFn = x && x.then;
                if (typeof thenFn !== "function")
                    return promise.fulfill(x);
                var alreadyCalled = false;
                var resolvePromise = function (value) {
                    if (alreadyCalled)
                        return;
                    alreadyCalled = true;
                    Promise.Resolve(promise, value);
                };
                var rejectPromise = function (r) {
                    if (alreadyCalled)
                        return;
                    alreadyCalled = true;
                    promise.reject(r);
                };
                try {
                    thenFn.apply(x, [resolvePromise, rejectPromise]);
                }
                catch (e) {
                    rejectPromise(e);
                }
                return promise;
            }
            catch (e) {
                return promise.reject(e);
            }
        };
        return Promise;
    }());
    Promise.nextTickFn = function (setTimeoutOrSimilarFn) { return setTimeout(setTimeoutOrSimilarFn, 0); };
    Lifelong.Promise = Promise;
})(Lifelong || (Lifelong = {}));
global.adapter = {
    deferred: function () { return Lifelong.Promise.beginChain(); },
    resolved: function (val) { return Lifelong.Promise.fulfilled(val); },
    rejected: function (reason) { return Lifelong.Promise.rejected(reason); },
};
