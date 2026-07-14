<!--
  认证页面组件（AuthPage）
  作用：
  1. 提供用户登录和注册功能（同页切换模式）
  2. 支持演示模式：输入 admin/123456 可无需后端直接进入系统
  3. 登录成功后保存 token 并跳转到工作台

  页面结构：
  ┌─────────────────────────────┐
  │  品牌标识（Logo + 项目名）    │
  │  标题（欢迎回来/创建账号）     │
  │  用户名输入框                 │
  │  密码输入框                   │
  │  登录/注册按钮                │
  │  错误提示                     │
  │  切换登录/注册按钮            │
  │  演示模式提示                 │
  └─────────────────────────────┘

  数据流：
  用户输入 → 表单提交 → 检查是否演示账号
    → 是：写入 demo token → 跳转工作台
    → 否：调用后端 login/register API → 写入 token → 跳转工作台
-->
<template>
  <!-- 认证页：居中卡片布局，参考 GPT 登录页简洁风格 -->
  <section class="auth-layout">
    <div class="auth-card">
      <!-- 品牌标识区：圆形渐变 Logo + 项目名称 + 副标题 -->
      <div class="brand">
        <span class="brand-dot"></span>
        <div>
          <h1>AI Vision Web</h1>
          <p>基于多模态 AI 的图像识别与语义分析系统</p>
        </div>
      </div>

      <!-- 动态标题：根据当前模式（登录/注册）切换显示文案 -->
      <h2>{{ isLoginMode ? "欢迎回来" : "创建账号" }}</h2>
      <p class="subtitle">{{ isLoginMode ? "登录以继续使用图像分析功能" : "注册一个新账号" }}</p>

      <!-- 登录/注册表单 -->
      <!-- @submit.prevent 阻止表单默认提交行为（页面刷新），改为 JS 处理 -->
      <form class="stack" @submit.prevent="handleSubmit">
        <label>
          用户名
          <!-- v-model.trim 自动去除首尾空格，required/minlength/maxlength 做前端校验 -->
          <input v-model.trim="form.username" placeholder="请输入用户名" required minlength="3" maxlength="64" />
        </label>

        <label>
          密码
          <input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            required
            minlength="6"
            maxlength="128"
          />
        </label>

        <!-- 提交按钮：loading 时禁用并显示"提交中..."，防止重复提交 -->
        <button class="primary" type="submit" :disabled="loading" style="margin-top: 4px">
          {{ loading ? "提交中..." : isLoginMode ? "登录" : "注册" }}
        </button>
      </form>

      <!-- 错误提示：后端返回的错误信息显示在这里 -->
      <p class="error" v-if="errorText">{{ errorText }}</p>

      <!-- 切换登录/注册模式按钮 -->
      <button class="ghost" @click="toggleMode" style="width: 100%; margin-top: 8px">
        {{ isLoginMode ? "没有账号？去注册" : "已有账号？去登录" }}
      </button>

      <!-- 演示模式提示：告知用户可以使用测试账号 -->
      <p class="demo-tip">测试快捷入口：admin / 123456（无需后端）</p>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { login, register } from "../api/auth";
import { setToken } from "../stores/authStore";

// 路由跳转方法
const router = useRouter();

// 页面状态
const isLoginMode = ref(true);    // 当前模式：true=登录，false=注册
const loading = ref(false);        // 提交中状态，防止重复点击
const errorText = ref("");         // 错误提示文案

// 统一表单数据：登录和注册共用同一份表单，避免维护两份重复数据
const form = reactive({
  username: "",
  password: "",
});

/**
 * 切换登录/注册模式
 * 同时清空错误提示，避免残留上一次的错误信息
 */
function toggleMode() {
  isLoginMode.value = !isLoginMode.value;
  errorText.value = "";
}

/**
 * 提交登录或注册
 * 执行流程：
 * 1. 检查是否为演示账号（admin/123456）→ 是则直接写入 demo token
 * 2. 登录模式：调用 login API → 获取 token → 保存 → 跳转工作台
 * 3. 注册模式：先调用 register → 再调用 login → 获取 token → 保存 → 跳转工作台
 */
async function handleSubmit() {
  loading.value = true;
  errorText.value = "";
  try {
    // 纯前端演示登录：admin/123456 无需后端即可进入系统
    if (isLoginMode.value && form.username === "admin" && form.password === "123456") {
      setToken("demo-admin-token"); // 写入特殊 token，触发 client.js 的演示模式
      router.push("/workbench");     // 跳转到工作台
      return;
    }

    if (isLoginMode.value) {
      // 登录流程：调用 API 获取 token 并保存
      const tokenData = await login(form);
      setToken(tokenData.access_token);
    } else {
      // 注册流程：先注册再自动登录，减少用户操作
      await register(form);
      const tokenData = await login(form);
      setToken(tokenData.access_token);
    }
    router.push("/workbench"); // 登录成功，跳转工作台
  } catch (error) {
    errorText.value = error.message || "操作失败"; // 显示后端返回的错误信息
  } finally {
    loading.value = false; // 无论成功失败，恢复按钮状态
  }
}
</script>
