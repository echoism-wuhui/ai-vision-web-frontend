/**
 * AI 配置管理 API 模块
 * 作用：封装 AI 模型配置的 CRUD 四个接口
 *
 * 后端接口对照：
 * - POST   /api/ai-configs         → 新增配置
 * - GET    /api/ai-configs         → 获取配置列表
 * - GET    /api/ai-configs/{id}    → 获取单个配置详情（前端暂未使用）
 * - PUT    /api/ai-configs/{id}    → 更新配置（部分更新）
 * - DELETE /api/ai-configs/{id}    → 删除配置
 *
 * 字段说明：
 * - config_name：配置显示名称
 * - provider：AI 服务类型（cloud=云端 / local=本地预留）
 * - base_url：AI API 地址（如 https://api.siliconflow.cn/v1）
 * - api_key：API 密钥（后端存储后不返回，编辑时留空表示不更新）
 * - model_name：模型名称（如 gpt-4o）
 * - is_default：是否为默认配置（0/1 整数，设为默认时自动取消其他默认）
 */
import { request } from "./client";

/**
 * 新增 AI 配置
 * @param {object} payload - { config_name, provider, base_url, api_key, model_name, is_default }
 * @returns {Promise<object>} 创建成功后的配置记录（不含 api_key）
 */
export function createAIConfig(payload) {
  return request("/api/ai-configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * 获取配置列表
 * @returns {Promise<Array>} 配置记录数组
 */
export function listAIConfigs() {
  return request("/api/ai-configs");
}

/**
 * 更新配置（部分更新）
 * 只传需要修改的字段，未传的字段保持不变
 * api_key 留空时不更新（后端约定）
 * @param {number} configId - 要更新的配置 ID
 * @param {object} payload - 要更新的字段
 * @returns {Promise<object>} 更新后的完整配置记录
 */
export function updateAIConfig(configId, payload) {
  return request(`/api/ai-configs/${configId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * 删除配置
 * @param {number} configId - 要删除的配置 ID
 * @returns {Promise<object>} { message: "删除成功" }
 */
export function deleteAIConfig(configId) {
  return request(`/api/ai-configs/${configId}`, {
    method: "DELETE",
  });
}
