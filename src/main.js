/**
 * 前端应用入口文件
 * 作用：
 * 1. 导入 Vue 的 createApp 方法，用于创建应用实例
 * 2. 导入根组件 App.vue（整个页面的最外层容器）
 * 3. 导入路由配置 router（控制页面跳转）
 * 4. 导入全局样式 main.css（所有页面共用的样式）
 * 5. 创建 Vue 应用 → 注册路由插件 → 挂载到 index.html 的 #app 元素
 *
 * 执行流程：createApp(App) 创建应用 → .use(router) 注册路由 → .mount("#app") 渲染到 DOM
 */
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles/main.css";

// 创建 Vue 应用实例，注册路由插件，挂载到 DOM 的 #app 元素
createApp(App).use(router).mount("#app");
