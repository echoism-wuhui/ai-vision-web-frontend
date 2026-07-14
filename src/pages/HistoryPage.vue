<!--
  历史记录页面组件（HistoryPage）
  作用：
  1. 展示当前用户的所有 AI 分析记录
  2. 支持关键词搜索（匹配 description/tags/scene/prompt/model_name）
  3. 支持按分析类型筛选
  4. 支持按时间或 ID 排序
  5. 支持编辑分析结果（修改 result_json）
  6. 支持删除分析记录（带二次确认）

  页面状态流转：
  加载中 → 骨架屏
  加载完成 + 有记录 → 搜索/筛选工具栏 + 卡片列表
  加载完成 + 无记录 → 空状态引导
  搜索/筛选后无匹配 → 搜索无结果提示

  数据流：
  onMounted → loadRecords → listAnalysis API → records 数组
  用户搜索/筛选/排序 → filteredRecords 计算属性自动过滤
  用户编辑 → openEditor → dialog 弹窗 → handleSaveEdit → updateAnalysis API
  用户删除 → confirm 确认 → deleteAnalysis API → 刷新列表
-->
<template>
  <!-- 历史记录页：搜索 + 筛选 + 排序 + 卡片列表 -->
  <section class="history-layout">
    <!-- 页面标题区：标题 + 记录计数 -->
    <div class="history-header">
      <h2>分析历史</h2>
      <!-- 显示筛选后的记录数 / 总记录数 -->
      <span class="history-count" v-if="records.length">
        {{ filteredRecords.length }} / {{ records.length }} 条记录
      </span>
    </div>

    <!-- 搜索与筛选工具栏：仅在有记录时显示 -->
    <div class="filter-bar" v-if="records.length">
      <!-- 搜索框：输入关键词实时筛选（computed 自动响应） -->
      <div class="filter-search">
        <input
          v-model.trim="searchKeyword"
          placeholder="搜索关键词..."
          @keyup.enter="searchKeyword = searchKeyword"
        />
      </div>

      <!-- 类型筛选下拉框 -->
      <select v-model="filterType" class="filter-select">
        <option value="all">全部类型</option>
        <option value="all">all</option>
        <option value="describe">describe</option>
        <option value="tags">tags</option>
        <option value="scene">scene</option>
        <option value="prompt">prompt</option>
      </select>

      <!-- 排序方式下拉框 -->
      <select v-model="sortOrder" class="filter-select">
        <option value="newest">最新优先</option>
        <option value="oldest">最早优先</option>
        <option value="id_desc">ID 降序</option>
        <option value="id_asc">ID 升序</option>
      </select>
    </div>

    <!-- 错误提示 -->
    <p class="error" v-if="errorText">{{ errorText }}</p>

    <!-- 状态 1：加载中 → 骨架屏 -->
    <div v-if="loading" class="history-list">
      <div v-for="n in 4" :key="'skeleton-' + n" class="history-card skeleton-card">
        <div class="skeleton-icon"></div>
        <div class="skeleton-body">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line skeleton-line-desc"></div>
        </div>
        <div class="skeleton-line skeleton-line-time"></div>
      </div>
    </div>

    <!-- 状态 2：无记录 → 空状态引导 -->
    <div v-else-if="!records.length" class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>暂无分析记录</h3>
      <p>前往工作台上传图片并分析，结果将自动保存到这里</p>
    </div>

    <!-- 状态 3：搜索/筛选后无匹配结果 -->
    <div v-else-if="!filteredRecords.length" class="empty-state" style="padding: 30px">
      <div class="empty-icon">🔍</div>
      <h3>无匹配结果</h3>
      <p>尝试调整搜索关键词或筛选条件</p>
    </div>

    <!-- 状态 4：有记录 → 卡片列表 -->
    <div v-else class="history-list">
      <div v-for="item in filteredRecords" :key="item.id" class="history-card">
        <!-- 左侧图标 -->
        <div class="history-card-icon">🖼️</div>

        <!-- 中间信息：标题 + 预览文本 -->
        <div class="history-card-body">
          <div class="history-card-title">
            分析 #{{ item.id }}
            <!-- 分析类型标签 -->
            <span class="ai-tag" style="font-size: 11px; padding: 2px 8px">{{ item.analysis_type }}</span>
          </div>
          <!-- 预览文本：优先显示 description，其次 scene/prompt -->
          <div class="history-card-desc" v-if="getPreview(item.result_json)">
            {{ getPreview(item.result_json) }}
          </div>
          <div class="history-card-desc" v-else>
            模型：{{ item.model_name || "未指定" }} · 图片ID：{{ item.image_id }}
          </div>
        </div>

        <!-- 右侧时间 -->
        <div class="history-card-time">{{ formatDate(item.created_at) }}</div>

        <!-- 操作按钮：编辑 + 删除 -->
        <div class="history-card-actions">
          <button class="ghost btn-sm" @click="openEditor(item)">编辑</button>
          <button class="danger btn-sm" @click="handleDelete(item.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗：修改 result_json 内容 -->
    <!-- 使用原生 <dialog> 元素，showModal() 打开，close() 关闭 -->
    <dialog ref="editorRef" class="dialog">
      <div class="dialog-header">
        <h3>编辑分析结果 #{{ editing?.id }}</h3>
        <button class="ghost btn-sm" @click="closeEditor">✕</button>
      </div>
      <div class="dialog-body">
        <p style="font-size: 13px; color: var(--ink-secondary); margin-bottom: 12px">
          编辑 result_json 字符串内容（修改后前端会自动重新解析展示）
        </p>
        <!-- 等宽字体编辑框，方便查看 JSON 格式 -->
        <textarea v-model="editingText" rows="14" style="font-family: monospace; font-size: 13px"></textarea>
      </div>
      <div class="dialog-footer">
        <button class="ghost" @click="closeEditor">取消</button>
        <button class="primary" @click="handleSaveEdit">保存修改</button>
      </div>
    </dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { deleteAnalysis, listAnalysis, updateAnalysis } from "../api/analysis";
import { parseResult } from "../utils/result";

// ==================== 响应式状态 ====================
const records = ref([]);          // 从后端加载的完整分析记录列表
const loading = ref(false);       // 加载中状态
const errorText = ref("");        // 错误提示
const editing = ref(null);        // 当前正在编辑的记录对象
const editingText = ref("");      // 编辑框中的文本内容
const editorRef = ref(null);      // dialog 元素的 DOM 引用

// 搜索与筛选状态
const searchKeyword = ref("");    // 搜索关键词
const filterType = ref("all");    // 类型筛选（all/describe/tags/scene/prompt）
const sortOrder = ref("newest");  // 排序方式

// ==================== 计算属性 ====================

/**
 * 根据搜索关键词和类型筛选，再排序
 * 这是 computed 属性，当 records/searchKeyword/filterType/sortOrder 任一变化时自动重新计算
 * 实现了"前端搜索"——数据全量加载后在浏览器内存中过滤，不需要后端分页接口
 */
const filteredRecords = computed(() => {
  let result = [...records.value]; // 复制数组，避免修改原数据

  // 步骤 1：按类型筛选
  if (filterType.value !== "all") {
    result = result.filter((item) => item.analysis_type === filterType.value);
  }

  // 步骤 2：按关键词搜索（在 description/tags/scene/prompt/model_name 中匹配）
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase(); // 转小写，实现不区分大小写
    result = result.filter((item) => {
      const parsed = parseResult(item.result_json); // 解析 result_json
      // 将所有可搜索字段拼接成一个字符串，检查是否包含关键词
      const searchable = [
        parsed.description,
        parsed.scene,
        parsed.prompt,
        parsed.tags.join(" "), // 标签数组拼接为空格分隔的字符串
        item.model_name || "",
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(kw);
    });
  }

  // 步骤 3：排序
  switch (sortOrder.value) {
    case "newest":
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // 最新在前
      break;
    case "oldest":
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // 最早在前
      break;
    case "id_desc":
      result.sort((a, b) => b.id - a.id); // ID 大的在前
      break;
    case "id_asc":
      result.sort((a, b) => a.id - b.id); // ID 小的在前
      break;
  }

  return result;
});

// ==================== 工具函数 ====================

/**
 * 从 result_json 中提取简短预览文本（用于卡片摘要展示）
 * 优先级：description > scene > prompt
 */
function getPreview(resultJson) {
  const parsed = parseResult(resultJson);
  return parsed.description || parsed.scene || parsed.prompt || "";
}

/**
 * 格式化日期为中文可读字符串
 * @param {string} value - ISO 8601 日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
}

// ==================== 数据加载 ====================

/**
 * 加载分析历史列表
 * 页面挂载时调用一次，编辑/删除后也会重新调用刷新
 */
async function loadRecords() {
  loading.value = true;
  errorText.value = "";
  try {
    records.value = await listAnalysis();
  } catch (error) {
    errorText.value = error.message || "加载历史失败";
  } finally {
    loading.value = false;
  }
}

// ==================== 编辑操作 ====================

/**
 * 打开编辑弹窗
 * @param {object} item - 要编辑的分析记录
 */
function openEditor(item) {
  editing.value = item;
  editingText.value = item.result_json || "";
  editorRef.value?.showModal(); // 使用原生 dialog 的 showModal 方法打开弹窗
}

/** 关闭编辑弹窗 */
function closeEditor() {
  editorRef.value?.close();
}

/**
 * 保存编辑结果
 * 调用 updateAnalysis API 更新 result_json，然后刷新列表
 */
async function handleSaveEdit() {
  if (!editing.value) return;
  try {
    await updateAnalysis(editing.value.id, { result_json: editingText.value });
    closeEditor();
    await loadRecords(); // 刷新列表以显示更新后的内容
  } catch (error) {
    errorText.value = error.message || "更新失败";
  }
}

// ==================== 删除操作 ====================

/**
 * 删除分析记录
 * 先弹出 confirm 确认框，用户确认后才执行删除
 * 这是防止误操作的关键交互设计
 */
async function handleDelete(id) {
  if (!confirm("确定要删除这条分析记录吗？此操作不可恢复。")) return;
  try {
    await deleteAnalysis(id);
    await loadRecords(); // 刷新列表
  } catch (error) {
    errorText.value = error.message || "删除失败";
  }
}

// ==================== 生命周期 ====================

// 页面挂载后加载分析历史列表
onMounted(loadRecords);
</script>
