<!--
  根组件 App.vue
  作用：
  1. 定义整个应用的最外层布局结构（顶部导航 + 内容区）
  2. 根据当前路由和登录状态决定是否显示顶部导航栏
  3. 提供全局退出登录功能
  4. 通过 <RouterView /> 渲染当前路由对应的页面组件

  布局结构：
  ┌─────────────────────────────────┐
  │  topbar（顶部导航栏）            │  ← 仅登录后显示
  ├─────────────────────────────────┤
  │  page-wrap（页面内容区）         │  ← RouterView 渲染当前页面
  │  ┌───────────────────────────┐  │
  │  │  当前页面组件              │  │
  │  └───────────────────────────┘  │
  └─────────────────────────────────┘

  组件关系：
  App.vue → AuthPage（登录）
          → WorkbenchPage（工作台）
          → HistoryPage（历史记录）
          → AIConfigPage（AI 配置）
-->
<template>
  <div class="app-shell">
    <!-- 顶部导航栏：参考 GPT 窄栏设计，品牌 + 导航 + 退出 -->
    <!-- v-if="showTopbar" 控制登录注册页不显示导航栏 -->
    <header class="topbar" v-if="showTopbar">
      <!-- 品牌标识区：圆形渐变点 + 项目名称 -->
      <div class="brand">
        <span class="brand-dot"></span>
        <h1>AI Vision Web</h1>
      </div>
      <!-- 导航链接：使用 RouterLink 实现 SPA 无刷新跳转 -->
      <nav class="topnav">
        <RouterLink to="/workbench">工作台</RouterLink>
        <RouterLink to="/history">历史记录</RouterLink>
        <RouterLink to="/ai-configs">AI 配置</RouterLink>
        <button class="ghost topbar-btn" @click="logout">退出</button>
      </nav>
    </header>

    <!-- 页面内容区：RouterView 会根据当前 URL 自动渲染对应的页面组件 -->
    <main class="page-wrap">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter, RouterLink, RouterView } from "vue-router";
import { clearToken, getToken } from "./stores/authStore";

// 获取当前路由信息和路由跳转方法
const route = useRoute();
const router = useRouter();

/**
 * 控制顶部导航栏的显示/隐藏
 * 条件：不在 /auth 页面 且 已登录（有 token）
 * 作用：登录注册页隐藏导航栏，避免干扰登录操作
 */
const showTopbar = computed(() => !["/auth"].includes(route.path) && !!getToken());

/**
 * 退出登录功能
 * 1. 清除 localStorage 中的 token
 * 2. 跳转到登录页
 * 3. 路由守卫会阻止后续未登录访问
 */
function logout() {
  clearToken();
  router.push("/auth");
}
</script>
