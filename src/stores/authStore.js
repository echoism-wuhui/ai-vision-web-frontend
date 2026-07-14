/**
 * 登录态存储模块（Token 管理）
 * 作用：
 * 1. 使用 localStorage 持久化存储用户的登录令牌（access_token）
 * 2. 页面刷新后 token 不丢失，保证用户无需重复登录
 * 3. 提供 setToken / getToken / clearToken 三个方法供全局使用
 *
 * 设计原因：
 * - localStorage 浏览器关闭后仍保留，比 sessionStorage 更持久
 * - 所有需要登录的 API 请求都通过 getToken() 获取 token 放入请求头
 * - 退出登录时通过 clearToken() 清除，使后续请求自动变为未登录状态
 *
 * 被哪些文件使用：
 * - client.js：每次请求时读取 token 放入 Authorization 头
 * - AuthPage.vue：登录成功后写入 token
 * - App.vue：退出登录时清除 token
 * - router/index.js：路由守卫检查 token 判断是否已登录
 */

// localStorage 的 key 名，避免与其他项目冲突
const TOKEN_KEY = "ai_vision_access_token";

/**
 * 保存登录令牌到 localStorage
 * @param {string} token - 后端返回的 access_token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 从 localStorage 读取登录令牌
 * @returns {string} token 值，不存在则返回空字符串
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

/**
 * 清除登录令牌（退出登录或 token 过期时调用）
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
