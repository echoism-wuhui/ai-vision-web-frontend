/**
 * 图片管理 API 模块
 * 作用：封装图片上传、列表查询、删除三个接口的请求逻辑
 *
 * 后端接口对照：
 * - POST /api/images          → 上传图片（multipart/form-data，字段名 file）
 * - GET  /api/images          → 获取当前用户的图片列表
 * - GET  /api/images/{id}     → 获取单张图片详情（前端暂未使用）
 * - DELETE /api/images/{id}   → 删除图片
 *
 * 注意事项：
 * - 上传图片时绝对不能手动设置 Content-Type，必须让浏览器自动添加 boundary
 * - 后端返回的 image.url 是相对路径（如 /uploads/xxx.png），前端需拼接 API_BASE
 */
import { request } from "./client";

/**
 * 上传图片
 * 使用 FormData 封装文件，浏览器会自动设置正确的 Content-Type 和 boundary
 * @param {File} file - 用户选择的图片文件
 * @returns {Promise<object>} 上传成功后的图片记录 { id, filename, url, ... }
 */
export function uploadImage(file) {
  const form = new FormData();
  form.append("file", file); // 字段名必须是 "file"，与后端 File(...) 对应
  return request("/api/images", {
    method: "POST",
    body: form,
    // 重要：不能设置 Content-Type，否则浏览器不会自动添加 boundary 导致上传失败
  });
}

/**
 * 获取图片列表
 * 返回当前登录用户的所有图片，按创建时间倒序
 * @returns {Promise<Array>} 图片记录数组 [{ id, filename, url, ... }, ...]
 */
export function listImages() {
  return request("/api/images");
}

/**
 * 删除图片
 * @param {number} imageId - 要删除的图片 ID
 * @returns {Promise<object>} { message: "删除成功" }
 */
export function deleteImage(imageId) {
  return request(`/api/images/${imageId}`, {
    method: "DELETE",
  });
}
