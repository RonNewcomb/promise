declare module Lifelong {
    class Promise<T> {
        then<R>(onFulfilled?: (input: T) => R, onRejected?: (error: T) => R): Promise<R>;
        catch<R>(onRejected: (error: T) => R): Promise<R>;
        static ajax(url: string, payload?: any): Promise<string>;
        static nextTickFn: <T>(setTimeoutOrSimilarFn: Function, caller: Promise<T>) => void;
        static beginChain<T>(): Deferred<T, T>;
        static beginChain<T>(resolvePromise: (toFulfill: (value: T) => void, toReject: (error: T) => void) => void): Promise<T>;
        static fulfilled<T>(value: T | Promise<T>): Promise<T>;
        static rejected<T>(error: T): Promise<T>;
        static all<T>(promises: Array<Promise<T>>): Promise<Array<T>>;
        protected constructor();
        protected status: "unresolved" | "FULFILLED" | "REJECTED";
        protected outcome: T;
        protected queue: Deferred<T, any>[];
        protected fulfill(x: T): Promise<T>;
        protected reject(error: T): Promise<T>;
        protected static Resolve<T>(promise: Promise<T>, x: T): Promise<T>;
    }
    interface Deferred<T, R> {
        resolve: (input: T) => R;
        reject: (error: T) => R;
        promise: Promise<R>;
    }
}
