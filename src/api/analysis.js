/**
 * 分析记录 API 模块
 * 作用：封装 AI 分析的创建、列表、更新、删除四个接口
 *
 * 后端接口对照：
 * - POST   /api/analysis         → 发起 AI 分析（同步调用，等待结果返回）
 * - GET    /api/analysis         → 获取当前用户的分析历史列表
 * - GET    /api/analysis/{id}    → 获取单条分析记录详情（前端暂未使用）
 * - PUT    /api/analysis/{id}    → 更新分析结果（修改 result_json）
 * - DELETE /api/analysis/{id}    → 删除分析记录
 *
 * 数据说明：
 * - analysis_type 可选值：all / describe / tags / scene / prompt
 * - result_json 是字符串类型，前端需 JSON.parse 后再展示
 * - ai_config_id 可选，不传则使用用户默认配置
 */
import { request } from "./client";

/**
 * 发起 AI 分析
 * 同步流程：前端发送请求 → 后端调用 AI → 返回结果 → 前端展示
 * @param {object} payload - { image_id, analysis_type, ai_config_id? }
 * @returns {Promise<object>} 分析结果记录 { id, result_json, latency, ... }
 */
export function createAnalysis(payload) {
  return request("/api/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * 获取分析历史列表
 * 返回当前用户的所有分析记录，按创建时间倒序
 * @returns {Promise<Array>} 分析记录数组 [{ id, analysis_type, result_json, ... }, ...]
 */
export function listAnalysis() {
  return request("/api/analysis");
}

/**
 * 更新分析记录
 * 用于修改 result_json 内容（用户手动编辑分析结果）
 * @param {number} analysisId - 要更新的记录 ID
 * @param {object} payload - { result_json: string }
 * @returns {Promise<object} 更新后的完整记录
 */
export function updateAnalysis(analysisId, payload) {
  return request(`/api/analysis/${analysisId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * 删除分析记录
 * @param {number} analysisId - 要删除的记录 ID
 * @returns {Promise<object>} { message: "删除成功" }
 */
export function deleteAnalysis(analysisId) {
  return request(`/api/analysis/${analysisId}`, {
    method: "DELETE",
  });
}
