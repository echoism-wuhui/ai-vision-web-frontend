/**
 * 认证相关 API 模块
 * 作用：封装注册、登录、获取当前用户三个接口的请求逻辑
 *
 * 后端接口对照：
 * - POST /api/auth/register  → 注册新用户（JSON body）
 * - POST /api/auth/login     → 登录获取 token（form body，不是 JSON）
 * - GET  /api/auth/me        → 获取当前登录用户信息（需 Bearer Token）
 *
 * 注意事项：
 * - 登录接口必须使用 URLSearchParams（form 格式），不是 JSON
 * - 这是后端 FastAPI 的 OAuth2PasswordRequestForm 要求的
 */
import { request } from "./client";

/**
 * 用户注册
 * @param {object} payload - { username: string, password: string }
 * @returns {Promise<object>} 注册成功后的用户信息 { id, username, created_at }
 */
export function register(payload) {
  return request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * 用户登录
 * 重要：后端要求使用 form 表单格式（application/x-www-form-urlencoded），不是 JSON
 * @param {object} param0 - { username: string, password: string }
 * @returns {Promise<object>} 登录成功后返回 { access_token, token_type }
 */
export function login({ username, password }) {
  const body = new URLSearchParams({ username, password });
  return request("/api/auth/login", {
    method: "POST",
    body,
    // 注意：这里不设置 Content-Type，让浏览器自动设置为 form 格式
  });
}

/**
 * 获取当前登录用户信息
 * 需要携带 Bearer Token，由 request() 自动附加
 * @returns {Promise<object>} 用户信息 { id, username, created_at }
 */
export function me() {
  return request("/api/auth/me");
}
