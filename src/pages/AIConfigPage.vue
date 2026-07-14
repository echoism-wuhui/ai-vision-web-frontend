<!--
  AI 配置管理页面组件（AIConfigPage）
  作用：
  1. 管理用户的 AI 模型配置（云端 API 地址、密钥、模型名等）
  2. 支持新增、编辑、删除、设默认配置四个操作
  3. 配置数据保存在后端数据库（ai_configs 表），前端通过 API 操作

  页面结构：
  ┌──────────────────────────────────────┐
  │  新增/编辑配置表单                      │
  │  ┌──────────┬──────────┐             │
  │  │ 配置名称  │ Provider │             │
  │  │ Base URL │ API Key  │             │
  │  │ 模型名称  │ 设为默认  │             │
  │  └──────────┴──────────┘             │
  │  [新增配置] / [更新配置]  [重置]        │
  ├──────────────────────────────────────┤
  │  已有配置列表                          │
  │  ┌──────────────────────────────────┐│
  │  │ 🔑 配置名称  cloud  model  [编辑][删除] ││
  │  │ 🔑 配置名称  cloud  model  [编辑][删除] ││
  │  └──────────────────────────────────┘│
  └──────────────────────────────────────┘

  字段说明（对应后端 ai_configs 表）：
  - config_name：配置显示名称（如"我的视觉模型"）
  - provider：AI 服务类型（cloud=云端，local=本地预留）
  - base_url：AI API 地址（如 https://api.siliconflow.cn/v1）
  - api_key：API 密钥（后端存储后不回显，编辑时留空表示不更新）
  - model_name：模型名称（如 gpt-4o）
  - is_default：是否为默认配置（0/1 整数）

  数据流：
  onMounted → loadConfigs → listAIConfigs API → configs 数组
  新增/编辑 → handleSubmit → createAIConfig / updateAIConfig API → 刷新列表
  删除 → confirm 确认 → deleteAIConfig API → 刷新列表
-->
<template>
  <!-- AI 配置页：表单 + 卡片列表，参考 GPT 设置页风格 -->
  <section class="config-layout">
    <!-- ==================== 新增/编辑配置表单 ==================== -->
    <div class="config-form-card">
      <!-- 动态标题：编辑模式显示"编辑配置"，新增模式显示"新增 AI 配置" -->
      <h2>{{ editingId ? "编辑配置" : "新增 AI 配置" }}</h2>
      <p class="subtitle">管理你的云端模型配置，用于图像分析时调用对应的 AI 服务</p>

      <!-- 配置表单 -->
      <form class="stack" @submit.prevent="handleSubmit">
        <div class="config-grid">
          <!-- 配置名称：必填 -->
          <label>
            配置名称
            <input v-model.trim="form.config_name" placeholder="例如：我的视觉模型" required />
          </label>

          <!-- Provider 类型选择：cloud（可用）/ local（预留不可用） -->
          <label>
            Provider
            <select v-model="form.provider">
              <option value="cloud">cloud（云端 API）</option>
              <option value="local">local（预留，暂不可用）</option>
            </select>
          </label>

          <!-- Base URL：AI 服务的 API 地址 -->
          <label>
            Base URL
            <input v-model.trim="form.base_url" placeholder="https://api.example.com/v1" />
          </label>

          <!-- API Key：编辑模式下留空表示不更新旧值 -->
          <label>
            API Key
            <input v-model.trim="form.api_key" :placeholder="editingId ? '留空则不更新' : 'sk-...'" />
          </label>

          <!-- 模型名称 -->
          <label>
            模型名称
            <input v-model.trim="form.model_name" placeholder="例如：gpt-4o" />
          </label>

          <!-- 设为默认配置复选框：v-model 绑定布尔值，提交时转为 0/1 -->
          <label class="checkbox-line" style="align-self: end">
            <input type="checkbox" v-model="form.is_default" />
            设为默认配置
          </label>
        </div>

        <!-- 操作按钮 -->
        <div class="actions" style="margin-top: 8px">
          <button class="primary" type="submit">
            {{ editingId ? "更新配置" : "新增配置" }}
          </button>
          <!-- 编辑模式下显示"取消编辑"，新增模式下显示"重置" -->
          <button class="ghost" type="button" @click="resetForm" v-if="editingId">取消编辑</button>
          <button class="ghost" type="button" @click="resetForm" v-else>重置</button>
        </div>
      </form>

      <!-- 错误提示 -->
      <p class="error" v-if="errorText" style="margin-top: 12px">{{ errorText }}</p>
    </div>

    <!-- ==================== 已有配置列表 ==================== -->
    <div>
      <div class="history-header">
        <h2 style="font-size: 18px; font-weight: 600">已有配置</h2>
        <span class="history-count" v-if="configs.length">{{ configs.length }} 个</span>
      </div>

      <!-- 状态 1：加载中 → 骨架屏 -->
      <div v-if="loading" class="config-list" style="margin-top: 12px">
        <div v-for="n in 3" :key="'skeleton-' + n" class="config-card" style="pointer-events: none">
          <div class="skeleton-icon"></div>
          <div class="skeleton-body" style="flex: 1">
            <div class="skeleton-line skeleton-line-title"></div>
            <div class="skeleton-line skeleton-line-desc" style="width: 180px"></div>
          </div>
        </div>
      </div>

      <!-- 状态 2：无配置 → 空状态引导 -->
      <div v-else-if="!configs.length" class="empty-state" style="padding: 40px">
        <div class="empty-icon">⚙️</div>
        <h3>暂无配置</h3>
        <p>在上方表单中新增一个 AI 模型配置</p>
      </div>

      <!-- 状态 3：有配置 → 卡片列表 -->
      <div v-else-if="configs.length" class="config-list" style="margin-top: 12px">
        <div v-for="item in configs" :key="item.id" class="config-card">
          <!-- 图标 -->
          <div class="config-card-icon">🔑</div>

          <!-- 配置信息：名称 + 默认标记 + provider + 模型名 -->
          <div class="config-card-body">
            <div class="config-card-title">
              {{ item.config_name }}
              <!-- 默认配置标记：仅 is_default 为 1 时显示 -->
              <span class="default-badge" v-if="item.is_default">默认</span>
            </div>
            <div class="config-card-meta">
              <span>{{ item.provider }}</span>
              <span>{{ item.model_name || "未指定模型" }}</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="config-card-actions">
            <button class="ghost btn-sm" @click="startEdit(item)">编辑</button>
            <button class="danger btn-sm" @click="handleDelete(item.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { createAIConfig, deleteAIConfig, listAIConfigs, updateAIConfig } from "../api/aiConfigs";

// ==================== 响应式状态 ====================
const configs = ref([]);     // 配置列表
const loading = ref(false);  // 加载中状态
const errorText = ref("");   // 错误提示
const editingId = ref(0);    // 当前编辑的配置 ID（0 表示新增模式）

// 配置表单数据
const form = reactive({
  config_name: "默认配置",
  provider: "cloud",
  base_url: "",
  api_key: "",      // API Key 不回显，编辑时留空表示不更新
  model_name: "",
  is_default: false, // 布尔值，提交时转为 0/1 整数
});

// ==================== 表单操作 ====================

/**
 * 重置表单到初始状态
 * 用于：新增模式下清空输入 / 编辑模式下取消编辑
 */
function resetForm() {
  editingId.value = 0;
  form.config_name = "默认配置";
  form.provider = "cloud";
  form.base_url = "";
  form.api_key = "";
  form.model_name = "";
  form.is_default = false;
}

// ==================== 数据加载 ====================

/**
 * 加载配置列表
 */
async function loadConfigs() {
  loading.value = true;
  try {
    configs.value = await listAIConfigs();
  } catch (error) {
    errorText.value = error.message || "配置加载失败";
  } finally {
    loading.value = false;
  }
}

// ==================== 编辑操作 ====================

/**
 * 进入编辑模式：将选中的配置数据填充到表单
 * 注意：api_key 不回显（后端不返回），留空表示"不更新"
 * @param {object} item - 要编辑的配置记录
 */
function startEdit(item) {
  editingId.value = item.id;
  form.config_name = item.config_name;
  form.provider = item.provider;
  form.base_url = item.base_url;
  form.api_key = "";  // 安全考虑：不回显 API Key
  form.model_name = item.model_name;
  form.is_default = !!item.is_default; // 整数转布尔值
}

// ==================== 提交操作 ====================

/**
 * 提交新增或更新
 * 新增时调用 createAIConfig，更新时调用 updateAIConfig
 * is_default 需要从布尔值转为整数（0/1），因为后端 schema 定义为 int
 */
async function handleSubmit() {
  errorText.value = "";
  try {
    const payload = {
      config_name: form.config_name,
      provider: form.provider,
      base_url: form.base_url,
      model_name: form.model_name,
      is_default: form.is_default ? 1 : 0, // 布尔转整数
    };

    // api_key 仅在有值时才提交（编辑时留空表示不更新，后端约定）
    if (form.api_key) {
      payload.api_key = form.api_key;
    }

    if (editingId.value) {
      // 更新模式
      await updateAIConfig(editingId.value, payload);
    } else {
      // 新增模式：api_key 必须传（后端字段要求）
      payload.api_key = payload.api_key || "";
      await createAIConfig(payload);
    }

    resetForm();       // 重置表单
    await loadConfigs(); // 刷新列表
  } catch (error) {
    errorText.value = error.message || "保存失败";
  }
}

// ==================== 删除操作 ====================

/**
 * 删除配置：需二次确认，防止误操作
 */
async function handleDelete(id) {
  if (!confirm("确定要删除这个 AI 配置吗？此操作不可恢复。")) return;
  try {
    await deleteAIConfig(id);
    await loadConfigs(); // 刷新列表
  } catch (error) {
    errorText.value = error.message || "删除失败";
  }
}

// ==================== 生命周期 ====================

// 页面挂载后加载配置列表
onMounted(loadConfigs);
</script>
