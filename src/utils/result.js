/**
 * 分析结果解析工具模块
 * 作用：
 * 统一解析后端返回的 result_json 字符串，避免每个页面重复写 JSON.parse 和错误处理
 *
 * 后端数据说明：
 * - analysis_results 表中的 result_json 字段是 TEXT 类型，存储的是 JSON 字符串
 * - 例如：'{"description":"...","tags":["..."],"scene":"...","prompt":"..."}'
 * - 前端必须 JSON.parse 后才能访问内部字段
 *
 * 解析策略：
 * 1. 如果 result_json 为空或 null，返回空对象
 * 2. 尝试 JSON.parse，成功则提取四个字段（description/tags/scene/prompt）
 * 3. 解析失败时（非标准 JSON），将原始文本作为 description 返回，避免页面崩溃
 *
 * 被哪些文件使用：
 * - WorkbenchPage.vue：展示最新分析结果
 * - HistoryPage.vue：提取卡片预览文本、搜索关键词匹配
 */

/**
 * 解析 result_json 字符串为结构化对象
 * @param {string} resultJson - 后端返回的 JSON 字符串
 * @returns {object} { description: string, tags: string[], scene: string, prompt: string }
 */
export function parseResult(resultJson) {
  // 空值保护：如果传入空字符串、null、undefined，直接返回空对象
  if (!resultJson) {
    return { description: "", tags: [], scene: "", prompt: "" };
  }

  try {
    // 尝试 JSON.parse 解析字符串
    const parsed = JSON.parse(resultJson);
    return {
      description: parsed.description || "",  // 图片内容描述
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],  // 关键词标签数组
      scene: parsed.scene || "",              // 场景识别结果
      prompt: parsed.prompt || "",            // AI prompt 反推结果
    };
  } catch {
    // JSON.parse 失败：后端返回的可能不是标准 JSON（如纯文本）
    // 此时将原始文本作为 description 展示，保证页面不崩溃
    return {
      description: String(resultJson),
      tags: [],
      scene: "",
      prompt: "",
    };
  }
}
