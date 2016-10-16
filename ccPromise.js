;(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(["exports"], factory)
    } else if (typeof exports !== "undefined") {
        factory(exports)
    } else {
        var mod = {
            exports: {}
        }
        factory(mod.exports)
        global.actual = mod.exports
    }
})(this, function (exports) {
    "use strict"

    // 三种状态
    let pending = 'PENDING'
    let fulfilled = 'FULFILLED'
    let rejected = 'REJECTED'

    // 空函数用来新建空的 promise 对象
    function INTERNAL() {
    }

    // 持有 resolve 和 reject 方法
    let handlers = {}

    function Promise(resolver) {

        // resolver 如果不是函数则抛出 TypeError
        if (typeof resolver !== 'function') {
            throw new TypeError('resolver must be a function');
        }

        // 状态
        this.state = pending
        // 回调函数队列（因为 then 可能会多次调用）
        this.queue = []
        // 最后输出给下一个回调的值
        this.out = void 0

        // 只调用一次，并且空函数不调用。
        if (resolver !== INTERNAL) {
            runOnce(this, resolver)
        }

    }

    Promise.prototype.then = function (onFulfilled, onRejected) {
        // onFulfilled、onRejected 不是函数必须被忽略
        if (typeof onFulfilled !== 'function' && this.state === fulfilled ||
            typeof onRejected !== 'function' && this.state === rejected) {
            return this;
        }

        // 用空函数创建一个返回用于链式调用的 promise
        let promise = new Promise(INTERNAL)
        if (this.state === pending) {
            this.queue.push(new QueueItem(promise, onFulfilled, onRejected))
        } else {
            // 针对非异步的代码
            let resolver = this.state === fulfilled ? onFulfilled : onRejected
            unwrap(promise, resolver, this.outcome);
        }

        return promise
    }

    Promise.prototype['catch'] = function (onRejected) {
        return this.then(null, onRejected)
    }

    // 队列元素
    function QueueItem(promise, onFulfilled, onRejected) {
        this.promise = promise;
        if (typeof onFulfilled === 'function') {
            this.onFulfilled = onFulfilled;
            this.callFulfilled = this.otherCallFulfilled;
        }
        if (typeof onRejected === 'function') {
            this.onRejected = onRejected;
            this.callRejected = this.otherCallRejected;
        }
    }

    // 如果不是函数，则直接以 value resolve
    QueueItem.prototype.callFulfilled = function (value) {
        handlers.resolve(this.promise, value)
    }
    // 如果是函数，则异步调用 onFulfilled，然后以调用结果为 resolve 的值对 then 返回的 promise 执行 resolve
    QueueItem.prototype.otherCallFulfilled = function (value) {
        unwrap(this.promise, this.onFulfilled, value)
    }
    // 如果不是函数，则直接以 value reject
    QueueItem.prototype.callRejected = function (value) {
        handlers.reject(this.promise, value)
    }
    // 如果是函数，则异步调用 onRejected，然后以调用结果为 reject 的值对 then 返回的 promise 执行 reject
    QueueItem.prototype.otherCallRejected = function (value) {
        unwrap(this.promise, this.onRejected, value)
    }

    // 延迟执行 func(value)
    // immediate 会将代码延迟到事件循环执行
    // 正常执行则 resolve
    // 否则 reject
    function unwrap(promise, func, value) {
        setTimeout(function () {
            var returnValue
            try {
                returnValue = func(value);
            } catch (e) {
                return handlers.reject(promise, e)
            }
            handlers.resolve(promise, returnValue)
        }, 0)
    }

    // 以 value resolve self 这个 promise
    handlers.resolve = function (self, value) {
        if (value === self) {
            handlers.reject(promise, new TypeError('Cannot resolve promise with itself'))
        }
        self.state = fulfilled
        self.out = value
        let i = -1;
        let len = self.queue.length
        // 取出当前 promise 的回调，并且执行，执行的结果关系到下一个 promise 的状态和结果
        while (++i < len) {
            self.queue[i].callFulfilled(value)
        }
        return self
    }

    // 以 error reject self 这个 promise
    handlers.reject = function (self, error) {
        self.state = rejected
        self.out = error
        let i = -1
        let len = self.queue.length
        // 取出当前 promise 的回调，并且执行，执行的结果关系到下一个 promise 的状态和结果
        while (++i < len) {
            self.queue[i].callRejected(error)
        }
        return self
    }

    // 仅执行一次
    function runOnce(self, func) {
        let called = false;

        function reject(error) {
            if (called) {
                return
            }
            called = true
            handlers.reject(self, error)
        }

        function resolve(value) {
            if (called) {
                return
            }
            called = true
            handlers.resolve(self, value)
        }

        function tryToUnwrap() {
            func(resolve, reject)
        }

        let result = tryCatch(tryToUnwrap)
        if (result.status === 'error') {
            reject(result.value)
        }
    }

    function tryCatch(func, arg) {
        let out = {}
        try {
            out.value = func(arg)
            out.status = 'success'
        } catch (e) {
            out.value = e
            out.status = 'error'
        }
        return out
    }

    Promise.resolve = function (value) {
        return handlers.resolve(new this(INTERNAL), value)
    }

    Promise.reject = function (reason) {
        return handlers.reject(new this(INTERNAL), reason)
    }

    exports.default = Promise

})