const title = {
  // 标签名称
  tag: "h1",
  // 标签属性
  props: {
    onClick: handler,
  },
  // 子节点
  children: [
    {
      tag: "span",
    },
  ],
};

/**
 * 手写的渲染函数就是使用虚拟 DOM 来描述 UI
 */

import { h } from "vue";

export default {
  render() {
    return h("h1", { onClick: handler }); // 虚拟 DOM
  },
};

// 渲染器
function mountElement(vnode, container) {
  // 使用 vnode.tag 作为标签名称创建 DOM 元素
  const el = document.createElement(vnode.tag);

  // 遍历 vnode.props, 将属性、事件添加到 DOM 元素
  for (const key in vnode.props) {
    if (/^on/.test(key)) {
      // 如果 key 以 on 开头，说明它是事件
      el.addEventListener(
        key.substring(2).toLowerCase(), // 事件名称 onClick --> click
        vnode.props[key] // 事件处理函数
      );
    }
  }

  //  处理 children
  if (typeof vnode.children === "string") {
    // 如果 children 是字符串，说明它是元素的文本子节点
    el.appendChild(document.createTextNode(vnode.children));
  } else if (Array.isArray(vnode.children)) {
    // 递归地调用 renderer 函数渲染子节点，使用当前元素 el 作为挂载点
    vnode.children.forEach((child) => {
      renderer(child, el);
    });
  }

  // 将元素添加到挂载点下
  container.appendChild(el);
}

const MyComponent = function () {
  return {
    tag: "div",
    props: {
      onClick: () => {
        alert("hello");
      },
    },
    children: "click me",
  };
};

function renderer(vnode, container) {
  if (typeof vnode.tag === "string") {
    // 说明 vnode 描述的是标签元素
    mountElement(vnode, container);
  } else if (typeof vnode.tag === "function") {
    // 说明 vnode 描述的是组件
    mountComponent(vnode, container);
  }
}

function mountComponent(vnode, container) {
  // 调用组件函数， 获取组件要渲染的内容（虚拟 DOM）
  const subtree = vnode.tag();

  // 递归地调用 renderer 渲染 subtree
  renderer(subtree, container);
}
