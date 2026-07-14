/**
 * 路由配置文件
 * 作用：
 * 1. 定义所有页面的 URL 路径与组件的映射关系
 * 2. 设置路由守卫（beforeEach），拦截未登录用户访问受保护页面
 * 3. 配置 history 模式，使 URL 更美观（无 # 号）
 *
 * 路由结构：
 * /            → 重定向到 /workbench
 * /auth        → 登录注册页（AuthPage）
 * /workbench   → 工作台（WorkbenchPage，需登录）
 * /history     → 历史记录（HistoryPage，需登录）
 * /ai-configs  → AI 配置管理（AIConfigPage，需登录）
 *
 * 路由守卫逻辑：
 * 如果目标路由的 meta.auth 为 true 且用户未登录（无 token），自动跳转到 /auth
 */
import { createRouter, createWebHistory } from "vue-router";
import AuthPage from "../pages/AuthPage.vue";
import WorkbenchPage from "../pages/WorkbenchPage.vue";
import HistoryPage from "../pages/HistoryPage.vue";
import AIConfigPage from "../pages/AIConfigPage.vue";
import { getToken } from "../stores/authStore";

// 路由表：定义每个 URL 路径对应的页面组件
const routes = [
  { path: "/", redirect: "/workbench" }, // 根路径重定向到工作台
  { path: "/auth", name: "auth", component: AuthPage }, // 登录注册页（无需鉴权）
  { path: "/workbench", name: "workbench", component: WorkbenchPage, meta: { auth: true } }, // 需要登录
  { path: "/history", name: "history", component: HistoryPage, meta: { auth: true } }, // 需要登录
  { path: "/ai-configs", name: "aiConfigs", component: AIConfigPage, meta: { auth: true } }, // 需要登录
];

// 创建路由实例，使用 HTML5 History 模式（URL 无 # 号）
const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * 全局路由守卫（前置守卫）
 * 每次页面跳转前执行，检查用户是否已登录
 * 如果目标页面需要鉴权（meta.auth === true）但用户没有 token，则强制跳转到登录页
 */
router.beforeEach((to) => {
  if (to.meta.auth && !getToken()) {
    return { path: "/auth" }; // 未登录，跳转到登录页
  }
  return true; // 已登录或目标页面无需鉴权，放行
});

export default router;
