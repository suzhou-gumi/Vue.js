// 用一个全局变量存储被注册的副作用函数
let activeEffect;

// effect 栈
const effectStack = [];

// effect 函数用于注册副作用函数
function effect(fn, options = {}) {
  const effectFn = () => {
    // 调用 cleanup 函数完成清除工作
    cleanup(effectFn);

    // 当调用 effect 注册副作用函数时，将副作用函数 fn 赋值给 activeEffect
    activeEffect = effectFn;

    // 在调用副作用函数之前将当前副作用函数压入栈中
    effectStack.push(effectFn);

    fn();

    // 在当前副作用函数执行完毕之后，将当前副作用函数弹出栈，并把
    // activeEffect 还原为之前的值
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };

  // 将 options 挂载到 effectFn 上
  effectFn.options = options;

  // activeEffect.deps 用来存储所有与该副作用函数相关联的依赖集合
  effectFn.deps = [];

  // 只有非 lazy 的时候，才执行
  if (!options.lazy) {
    // 执行副作用函数
    effectFn();
  }

  // 将副作用函数作为返回值返回
  return effectFn;
}

effect(
  // 一个匿名的副作用函数
  () => {
    document.body.innerText = obj.text;
  },

  // options
  {
    // 调度器 scheduler 是一个函数
    schedular(fn) {
      // 每次调度时，将副作用函数添加到 jobQueue 队列中
      jobQueue.add(fn);

      // 调用 flushJob 刷新队列
      flushJob();
    },
    lazy: true,
  }
);

obj.foo++;

// 存储副作用函数的桶
const bucket = new WeakMap();

// 原始数据
const data = { text: "hello world", foo: 1 };

const obj = new Proxy(data, {
  // 拦截读取操作
  get(target, key) {
    track(target, key);

    // 返回属性值
    return target[key];
  },

  // 设置拦截操作
  set(target, key, newVal) {
    // 设置属性值
    target[key] = newVal;

    trigger(target, key);
  },
});

/**
 * WeakMap 由 target --> Map 构成；
 * Map 由 key --> Set 构成。
 */

// 在 get 拦截函数内调用 track 函数追踪变化
function track(target, key) {
  // 没有 activeEffect, 直接 return
  if (!activeEffect) return target[key];

  // 根据 target 从“桶”中取得depsMap，它也是一个Map类型：key --> effects
  let depsMap = bucket.get(target);

  // 如果不存在 depsMap，那么新建一个 Map 并与 target 关联
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()));
  }

  // 再根据 key 从 depsMap 中取得 deps， 它是一个 Set 类型，
  // 里面存储着所有与当前 key 相关联的副作用函数：effects
  let deps = depsMap.get(key);

  // 如果 deps 不存在，同样新建一个 Set 并与 key 关联
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }

  // 最后将当前激活的副作用函数添加到“桶”里
  deps.add(activeEffect);

  // deps 就是一个与当前副作用函数存在联系的依赖集合
  // 将其添加到 activeEffect.deps 数组中
  activeEffect.deps.push(deps); // 新增
}

// 在 set 拦截函数内调用 trigger 函数触发变化
function trigger(target, key) {
  // 根据 target 从桶中取得 depsMap， 它是 key --> effects
  const depsMap = bucket.get(target);

  if (!depsMap) return;

  // 根据 key 取得所有副作用函数 effects
  const effects = depsMap.get(key);

  // 执行副作用函数
  const effectsToRun = new Set();

  effects &&
    effects.forEach((effectFn) => {
      // 如果 trigger 触发执行的副作用函数与当前正在执行的副作用函数相同，则不触发执行
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn);
      }
    });

  effectsToRun.forEach((effectFn) => {
    // 如果一个副作用函数存在调度器，则调用调度器吗，并将副作用函数作为参数传递
    if (effectFn.options.schedular) {
      effectFn.options.schedular(effectFn);
    } else {
      // 否则直接执行副作用函数（默认行为）
      effectFn();
    }
  });
}

function cleanup(effectFn) {
  // 遍历 effectFn.deps 数组
  for (let i = 0; i < effectFn.deps.length; i++) {
    // deps 是依赖集合
    const deps = effectFn.deps[i];

    // 将 effectFn 从依赖集合中移除
    deps.delete(effectFn);
  }

  // 最后需要重置 effectFn.deps 数组
  effectFn.deps.length = 0;
}

// 定义一个任务队列
const jobQueue = new Set();

// 使用 Promise.resolve() 创建一个 promise 实例，我们用它将一个任务添加到微任务队列
const p = Promise.resolve();

// 一个标志代表是否正在刷新队列
let isFlushing = false;

function flushJob() {
  // 如果队列正在刷新，则什么都不做
  if (isFlushing) return;

  // 设置为 true，代表正在刷新
  isFlushing = true;

  // 在微任务队列中刷新 jobQueue 队列
  p.then(() => {
    jobQueue.forEach((job) => job());
  }).finally(() => {
    // 结束后重置 isFlushing
    isFlushing = false;
  });
}
