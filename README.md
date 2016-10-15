## Promise/A+ 规范翻译

一个 promise 对象代表了一个异步操作的最终结果。我们主要通过 `then` 方法来跟 promise 对象打交道，这里讲的 `then` 方法可以注册两个回调，第一个回调接收异步操作的最终结果，第二个回调接收无法 promise 对象转变为 fulfilled 状态的原因。

这个规范详细地规定了 `then` 方法的行为，提供了一个所有 Promises/A+ 的实现能够依赖的具有一致性的交互基础。因此，这个规范被认为是十分稳定的。此外虽然 Promises/A+ 组织偶尔会针对一些新发现做一些向后兼容的修正，但是我们只会在经过仔细地考虑、讨论、测试后整合大的或者向后兼容的改动。

从历史来看，Promise/A+ 建立在先前 [Promises/A proposal](http://wiki.commonjs.org/wiki/Promises/A) 规范的行为之上，并且加入了一些非规范的事实标准，去除了一些错误的部分。

最终，核心的 Promises/A+ 规范不处理如何创建、fulfill 或者 reject promises 对象，而是选择来关注提供一个交互性的 `then` 方法。未来对于相关规范的工作可能也会触及这些主题。

### 1. 术语

1. “promise” 是一个带有 `then` 方法的对象或者函数，`then` 方法的行为符合这个规范。
2. “thenable” 是一个定义了 `then` 方法的对象或者函数，但是不要求 `then` 方法的行为符合这个规范。
3. “value” 是任何合法的 JavaScript 值（包括 `undefined`、一个 thenable、一个 promise）。
4. “exception” 是一个被 `throw` 表达式抛出的错误值。
5. “reason” 是一个表明 promise 对象变为 rejected 状态原因的值。

### 2. 要求

#### Promise 状态

一个 promise 必须是下面三个状态之一：pending、fulfilled、rejected。

- 当处于 pending 状态：
 - 也许被转变为 fulfilled 或 rejected 状态。
- 当处于 fulfilled 状态：
 - 不能再转变为任何其它状态。
 - 必须有一个不可变的 value。
- 当处于 rejected 状态：
 - 不能再转变为任何其它状态。
 - 必须有一个不可变的 reason。

这里的不可变值得是引用的不可变，而不保证引用内部的变化，类似于 `===`。
 
#### `then` 方法

一个 promise 必须提供一个 `then` 方法来访问它自身或者最终结果或则 reason。

一个 promise 的 `then` 方法接受两个参数：

```
promise.then(onFulfilled, onRejected)
```

1. `onFulfilled` 和 `onRejected` 都是可选的参数：
 1. 如果 `onFulfilled` 不是函数，必须被忽略。
 2. 如果 `onRejected` 不是函数，必须被忽略。
2. 如果 `onFulfilled` 是一个函数：
 1. 在 `promise` 变为 fulfilled 状态后，必须被调用，并把 `promise` 的 value 作为第一个参数传递。
 2. 不能够在 `promise` 变为 fulfilled 状态前被调用。
 3. 不能够被多次调用。
3. 如果 `onRejected` 是一个函数：
 1. 在 `promise` 变为 rejected 状态后，必须被调用，并把 `promise` 的 reason 作为第一个参数传递。
 2. 不能够在 `promise` 变为 rejected 状态前被调用。
 3. 不能够被多次调用。
4. `onFulfilled` 和 `onRejected` 直到执行上下文栈只包含平台代码（见注意点 3.1）才能够执行。
5. `onFulfilled` 和 `onRejected` 必须作为函数被调用（即没有 `this`，注意点 3.2）
6. 在同一个 promise 上，`then` 可能会被调用多次。
 1. 当 `promise` fulfilled，所有的 `onFulfilled` 将被执行按 `then` 被调用位置的顺序。
 2. 当 `promise` rejected，所有的 `onRejected` 将被执行按 `then` 被调用位置的顺序。
7. `then` 必须返回一个 promise（见注意点 3.3） 
```
promise2 = promise1.then(onFulfilled, onRejected);
```
 1. 如果 `onFulfilled` 或 `onRejected` 返回了值 `x`，则运行 Promise 解析过程 `[[Resolve]](promise2, x)`。
 2. 如果 `onFulfilled` 或 `onRejected` 抛出了异常 `e`，则 `promise2` 应当以 `e` 为 reason 被拒绝。
 3. 如果 `onFulfilled` 不是一个函数并且 `promise1` 已经 fulfilled，`promise2` 必须被用 `promise1` 同样的 value fulfilled。
 4. 如果 `onRejected ` 不是一个函数并且 `promise1` 已经 rejected，`promise2` 必须被用 `promise1` 同样的 value rejected。

#### Promise 解析过程

Promise 解析过程是一个抽象操作，输入一个 promise 和一个 value，表示成 `[[Resolve]](promise, value)`。如果 `x` 是一个 thenable，若 `x`的行为与 promise 类似，则使 `promise` 采用 `x` 的状态。否则，用 `x` 覆盖 `promise`。

运行 `[[Resolve]](promise, x)`，表现为如下步骤：

1. 如果 `promise` 和 `x` 是同一个对象，那么用一个 `TypeError` 为 reason reject `promise`。
2. 如果 `x` 是一个 promise，采用它的状态（见注意点 3.4）：
 1. 如果 `x` 是 pending 状态, promise 必须保持 pending 直到 `x` 变为 fulfilled 或 rejected 状态。
 2. 如果 `x` 是 fulfilled 状态，用相同的 value fulfill promise。
 3. 如果 `x` 是 rejected 状态，用相同的 reason reject promise。
3. 否则 `x` 是一个对象或者函数。
 1. 把 `x.then` 赋值给 `then`。（见注意点 3.5）
 2. 如果此时 `x.then` 导致了异常，那么就把 `e` 作为 reason reject promise。
 3. 如果 `then` 是一个函数，以 `x` 为 `this`，第一个参数是 `resolvePromise`，第二个参数是 `rejectPromise`。
     1. 当 `resolvePromise` 被以 y 为参数调用，执行 `[[Resolve]](promise, y)`
     2. 当 `rejectPromise` 被以 `r` 为参数调用，则以 `r` 为 reason reject `promise`。
     3. 如果 `resolvePromise` 和 `rejectPromise` 都被调用，或者多个调用同属在一个参数上触发，第一个调用具有优先权，并且其它的调用都被忽略。
     4. 如果调用 `then` 抛出了异常 `e`：
         1. 如果 `resolvePromise` 或 `rejectPromise` 已经被调用了，则忽略它。
         2. 否则，用 `e` 为 reason reject `promise`。
 4. 如果 `then` 不是一个函数，则 以 `x` 为值 fulfill promise。
4. 如果 `x` 不是对象也不是函数，则以 `x` 为值 fulfill promise。

如果一个 promise 用一个 thenable 来 resolve，会带来循环的 thenable 链，`[[Resolve]](promise, thenable)` 的递归性质最终会造成 `[[Resolve]](promise, thenable)` 被再次调用，按照上面的算法将会导致无穷递归。对于实现来说检测这种递归然后用 `TypeError` 作为 reason reject `promise` 是鼓励的做法，但不是必须的。

### 3. 注意点     

1. 这里的平台代码指的是引擎、环境以及 promise 的实现代码。在实践中，这个要求可以保证 `onFulfilled` 和 `onRejected` 被异步地执行，`then` 是在事件循环中被调用的，它有一个新鲜的调用栈。这可以使用如 `setTimeout` 或者 `setImmediate` 这类 “macro-task” 机制来实现，也可以使用 `MutationObserver` 或 `process.nextTick` 这类 “micro-task” 机制来实现。当 promise 的实现在考虑平台代码的时候，也可以自己包含一个任务调度队列，在队列内部处理器被调用。
2. 在严格模式下 `this` 将是 `undefined`，宽松模式下，将是全局对象。
3. 实现也许允许 `promise2 === promise1`，这使得实现能够满足所有的要求。但是每一个实现应当注明是否能够产生 `promise2 === promise1` 以及在什么情况下可以。
4. 通常情况下，他只会被认为 `x` 是一个真的 promise，如果它来自当前的实现。这个条款允许特定实现有办法接受来自已知一致性 promises 的状态。
5. 把 `x.then` 赋值给 `then`，主要是为了防止多次访问 `x.then`，而 `x.then` 在多次访问中可能会被改变，导致不一致的情况出现。 

