<!--
  工作台页面组件（WorkbenchPage）
  作用：
  这是系统的核心页面，承载"上传图片 → 配置分析 → 发起 AI 分析 → 展示结果"完整流程

  页面布局（左右分栏，参考 ChatGPT 对话式设计）：
  ┌──────────────────┬──────────────────────────┐
  │  左侧：输入面板    │  右侧：AI 回答面板         │
  │  ┌──────────────┐ │  ┌──────────────────────┐ │
  │  │ 1. 上传图片   │ │  │  骨架屏（分析中）       │ │
  │  │  文件选择区    │ │  │  或                    │ │
  │  │  上传按钮     │ │  │  AI 回答气泡            │ │
  │  ├──────────────┤ │  │  （结果分块展示）       │ │
  │  │ 2. 配置分析   │ │  │  或                    │ │
  │  │  选择图片     │ │  │  空状态引导             │ │
  │  │  分析类型     │ │  └──────────────────────┘ │
  │  │  AI 配置     │ │                            │
  │  ├──────────────┤ │                            │
  │  │  开始分析按钮  │ │                            │
  │  └──────────────┘ │                            │
  └──────────────────┴──────────────────────────┘

  数据流：
  onMounted → loadBaseData（加载图片列表 + AI 配置列表）
  用户选择文件 → handleUpload → 上传图片 → 刷新列表 → 自动选中新图片
  用户点击分析 → handleAnalyze → 调用 createAnalysis API → 展示结果
  结果展示：parseResult 解析 result_json → 按字段分块渲染
-->
<template>
  <!-- 工作台：左侧输入 + 右侧 AI 回答，类 ChatGPT 对话布局 -->
  <section class="workbench-layout">
    <!-- ==================== 左侧：输入面板 ==================== -->
    <aside class="panel input-panel">
      <h2>图像分析</h2>
      <p class="subtitle">上传图片，选择分析类型，获取 AI 语义理解结果</p>

      <!-- 步骤 1：上传图片区域 -->
      <div class="input-section">
        <div class="input-section-title">1. 上传图片</div>
        <!-- 文件选择区：点击或拖拽选择图片，点击区域覆盖整个虚线框 -->
        <div class="upload-zone" :class="{ 'has-file': selectedFile }">
          <!-- 隐藏的 file input，通过 CSS 覆盖整个区域实现点击上传 -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            @change="onFileChange"
          />
          <!-- 根据是否已选文件显示不同内容 -->
          <div class="upload-icon">{{ selectedFile ? "✅" : "📁" }}</div>
          <div class="upload-text" v-if="!selectedFile">
            点击选择图片，或拖拽到此处<br>
            <strong>支持 JPG / PNG / GIF / WEBP，最大 10MB</strong>
          </div>
          <div class="upload-text" v-else>
            已选择：<strong>{{ selectedFile.name }}</strong>
            <!-- 显示文件大小（格式化为 KB/MB） -->
            <span v-if="selectedFile.size">（{{ formatFileSize(selectedFile.size) }}）</span>
          </div>
        </div>
        <!-- 上传按钮：仅在选中文件且未上传中时可点击 -->
        <button
          class="primary"
          style="width: 100%; margin-top: 10px"
          :disabled="!selectedFile || uploading"
          @click="handleUpload"
        >
          {{ uploading ? "上传中..." : "上传图片" }}
        </button>
      </div>

      <!-- 步骤 2：配置分析参数 -->
      <div class="input-section">
        <div class="input-section-title">2. 配置分析</div>
        <div class="stack">
          <!-- 选择图片下拉框：从已上传的图片列表中选择 -->
          <label>
            选择图片
            <select v-model.number="analysisForm.image_id">
              <option :value="0" disabled>请选择已上传图片</option>
              <option v-for="item in images" :key="item.id" :value="item.id">
                #{{ item.id }} - {{ item.filename }}
              </option>
            </select>
          </label>

          <!-- 分析类型选择：对应后端 AnalysisRequest 的 analysis_type 字段 -->
          <label>
            分析类型
            <select v-model="analysisForm.analysis_type">
              <option value="all">all（完整分析）</option>
              <option value="describe">describe（内容描述）</option>
              <option value="tags">tags（标签提取）</option>
              <option value="scene">scene（场景识别）</option>
              <option value="prompt">prompt（反推提示词）</option>
            </select>
          </label>

          <!-- AI 配置选择：可选，不选则使用后端默认配置 -->
          <label>
            AI 配置（可选）
            <select v-model.number="analysisForm.ai_config_id">
              <option :value="0">默认配置</option>
              <option v-for="item in aiConfigs" :key="item.id" :value="item.id">
                #{{ item.id }} - {{ item.config_name }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <!-- 发起分析按钮：仅在选中图片且未分析中时可点击 -->
      <button
        class="primary"
        style="width: 100%"
        :disabled="analyzing || !analysisForm.image_id"
        @click="handleAnalyze"
      >
        {{ analyzing ? "分析中..." : "开始分析" }}
      </button>

      <!-- 错误提示：上传失败或分析失败时显示 -->
      <p class="error" v-if="errorText" style="margin-top: 12px">{{ errorText }}</p>
    </aside>

    <!-- ==================== 右侧：AI 回答面板 ==================== -->
    <section class="panel response-panel">
      <h2>AI 回答</h2>
      <p class="subtitle">结果将同步保存到历史记录，可后续查看和编辑</p>

      <!-- 状态 1：分析中 → 显示骨架屏加载动画 -->
      <div v-if="analyzing" class="ai-bubble" style="animation: skeleton-pulse 1.5s ease-in-out infinite">
        <div class="ai-bubble-header">
          <div class="ai-avatar"></div>
          <div class="ai-bubble-meta">AI Vision · 正在分析中...</div>
        </div>
        <!-- 骨架屏：模拟结果卡片的形状，让用户知道结果将出现在哪里 -->
        <div class="result-grid">
          <div class="result-card">
            <div class="skeleton-line skeleton-line-title" style="width: 100px; height: 11px; margin-bottom: 8px"></div>
            <div class="skeleton-line" style="height: 14px; width: 90%; margin-bottom: 6px"></div>
            <div class="skeleton-line" style="height: 14px; width: 70%"></div>
          </div>
          <div class="result-card">
            <div class="skeleton-line skeleton-line-title" style="width: 80px; height: 11px; margin-bottom: 8px"></div>
            <div style="display: flex; gap: 6px">
              <div class="skeleton-line" style="height: 24px; width: 60px; border-radius: 999px"></div>
              <div class="skeleton-line" style="height: 24px; width: 50px; border-radius: 999px"></div>
              <div class="skeleton-line" style="height: 24px; width: 70px; border-radius: 999px"></div>
            </div>
          </div>
          <div class="result-card">
            <div class="skeleton-line skeleton-line-title" style="width: 80px; height: 11px; margin-bottom: 8px"></div>
            <div class="skeleton-line" style="height: 14px; width: 60%"></div>
          </div>
        </div>
      </div>

      <!-- 状态 2：有分析结果 → 展示 AI 回答气泡 -->
      <div v-else-if="latestResult" class="ai-bubble">
        <!-- 气泡头部：AI 头像 + 模型信息 + 耗时 -->
        <div class="ai-bubble-header">
          <div class="ai-avatar"></div>
          <div class="ai-bubble-meta">
            AI Vision · {{ latestResult.model_name || "vision-model" }} · {{ latestResult.analysis_type }}
            <span v-if="latestResult.latency"> · 耗时 {{ latestResult.latency }}s</span>
          </div>
        </div>

        <!-- 结果分块展示：description / tags / scene / prompt 各自独立卡片 -->
        <div class="result-grid">
          <!-- 内容描述卡片：仅在有内容时显示 -->
          <div class="result-card" v-if="parsedResult.description">
            <div class="result-card-label">内容描述</div>
            <div class="result-card-value">{{ parsedResult.description }}</div>
          </div>

          <!-- 标签提取卡片：以药丸标签形式展示 -->
          <div class="result-card" v-if="parsedResult.tags.length">
            <div class="result-card-label">标签提取</div>
            <div class="ai-tags">
              <span v-for="tag in parsedResult.tags" :key="tag" class="ai-tag">{{ tag }}</span>
            </div>
          </div>

          <!-- 场景识别卡片 -->
          <div class="result-card" v-if="parsedResult.scene">
            <div class="result-card-label">场景识别</div>
            <div class="result-card-value">{{ parsedResult.scene }}</div>
          </div>

          <!-- Prompt 反推卡片 -->
          <div class="result-card" v-if="parsedResult.prompt">
            <div class="result-card-label">Prompt 反推</div>
            <div class="result-card-value">{{ parsedResult.prompt }}</div>
          </div>
        </div>
      </div>

      <!-- 状态 3：无结果 → 空状态引导 -->
      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>等待分析</h3>
        <p>上传一张图片并选择分析类型，AI 将为你生成语义分析结果</p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { createAnalysis } from "../api/analysis";
import { listAIConfigs } from "../api/aiConfigs";
import { listImages, uploadImage } from "../api/images";
import { parseResult } from "../utils/result";

// ==================== 响应式状态 ====================
const images = ref([]);           // 已上传的图片列表
const aiConfigs = ref([]);        // AI 配置列表
const selectedFile = ref(null);   // 用户选择的待上传文件
const fileInputRef = ref(null);   // 文件 input 的 DOM 引用（用于重置）
const uploading = ref(false);     // 上传中状态
const analyzing = ref(false);     // 分析中状态
const errorText = ref("");        // 错误提示文案
const latestResult = ref(null);   // 最新的分析结果

// 分析表单状态（用户选择的分析参数）
const analysisForm = reactive({
  image_id: 0,           // 选中的图片 ID
  analysis_type: "all",  // 分析类型
  ai_config_id: 0,       // AI 配置 ID（0 表示使用默认配置）
});

/**
 * 计算属性：解析 latestResult 的 result_json 字符串为对象
 * 使用 parseResult 工具函数，保证解析逻辑统一
 */
const parsedResult = computed(() => parseResult(latestResult.value?.result_json || ""));

// ==================== 工具函数 ====================

/**
 * 格式化文件大小为人类可读字符串
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} 格式化后的字符串（如 "1.2 MB"）
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * 文件选择事件处理
 * 用户通过 file input 选择文件后触发
 */
function onFileChange(event) {
  selectedFile.value = event.target.files?.[0] || null;
}

// ==================== 数据加载 ====================

/**
 * 加载基础数据：图片列表 + AI 配置列表
 * 使用 Promise.all 并行请求，减少加载时间
 * 加载完成后自动选中第一张图片（如果有）
 */
async function loadBaseData() {
  const [imageData, configData] = await Promise.all([listImages(), listAIConfigs()]);
  images.value = imageData;
  aiConfigs.value = configData;
  // 自动选中第一张图片，减少用户操作
  if (!analysisForm.image_id && imageData.length) {
    analysisForm.image_id = imageData[0].id;
  }
}

// ==================== 业务操作 ====================

/**
 * 上传图片
 * 流程：调用 API 上传 → 刷新列表 → 自动选中新图片 → 清空文件选择
 */
async function handleUpload() {
  if (!selectedFile.value) return;
  uploading.value = true;
  errorText.value = "";
  try {
    const image = await uploadImage(selectedFile.value);
    await loadBaseData();              // 刷新图片列表
    analysisForm.image_id = image.id;  // 自动选中新上传的图片
    selectedFile.value = null;          // 清空文件选择
    // 重置 file input 的 DOM 值，确保视觉和内部状态一致
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  } catch (error) {
    errorText.value = error.message || "上传失败";
  } finally {
    uploading.value = false;
  }
}

/**
 * 发起 AI 分析
 * 流程：构建请求参数 → 调用 createAnalysis API → 展示结果
 * 注意：这是同步调用，后端会等 AI 返回结果后才响应
 */
async function handleAnalyze() {
  if (!analysisForm.image_id) {
    errorText.value = "请先选择图片";
    return;
  }
  analyzing.value = true;
  errorText.value = "";
  try {
    const payload = {
      image_id: analysisForm.image_id,
      analysis_type: analysisForm.analysis_type,
    };
    // ai_config_id 为 0 时不传（后端会使用默认配置）
    if (analysisForm.ai_config_id) {
      payload.ai_config_id = analysisForm.ai_config_id;
    }
    latestResult.value = await createAnalysis(payload);
  } catch (error) {
    errorText.value = error.message || "分析失败";
  } finally {
    analyzing.value = false;
  }
}

// ==================== 生命周期 ====================

// 页面挂载后加载图片列表和 AI 配置列表
onMounted(async () => {
  try {
    await loadBaseData();
  } catch (error) {
    errorText.value = error.message || "加载失败";
  }
});
</script>
