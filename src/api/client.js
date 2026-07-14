/**
 * 统一请求封装模块（HTTP Client）
 * 作用：
 * 1. 封装所有 HTTP 请求逻辑，其他 API 模块只需调用 request() 即可
 * 2. 自动附加 Authorization 请求头（Bearer Token）
 * 3. 统一处理 JSON 解析、错误格式归一化、401 鉴权失败自动登出
 * 4. 支持演示模式：在无后端时用 localStorage 模拟 CRUD，便于课堂演示
 *
 * 被哪些文件使用：
 * - auth.js / images.js / analysis.js / aiConfigs.js：所有 API 模块都依赖此文件发送请求
 *
 * 数据流：
 * 页面组件 → API 模块 → request() → fetch(后端地址) → 解析响应 → 返回数据/抛出错误
 */
import { clearToken, getToken } from "../stores/authStore";

// 后端服务基地址，所有 API 请求都以此为前缀
export const API_BASE = "http://127.0.0.1:8000";

// 演示模式专用 token，当 localStorage 中存的是此值时走模拟逻辑
const DEMO_TOKEN = "demo-admin-token";
// 演示数据在 localStorage 中的 key 名
const DEMO_DB_KEY = "ai_vision_demo_db";

/**
 * 错误信息归一化函数
 * 后端返回的 detail 可能是字符串、数组（字段校验错误）或其他格式
 * 此函数统一将其转为可读的字符串提示
 * @param {*} detail - 后端返回的 detail 字段
 * @param {string} fallback - 兜底提示文案
 * @returns {string} 用户可读的错误信息
 */
function normalizeError(detail, fallback) {
  if (Array.isArray(detail)) {
    // 数组格式：后端字段校验错误，如 [{"msg": "用户名已存在"}, ...]
    return detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
  }
  if (typeof detail === "string" && detail) {
    return detail;
  }
  return fallback;
}

/**
 * 判断当前是否为演示模式
 * 当 token 为 "demo-admin-token" 时，所有请求走 localStorage 模拟
 * @param {string} token - 当前存储的 token
 * @returns {boolean}
 */
function isDemoMode(token) {
  return token === DEMO_TOKEN;
}

/**
 * 从 localStorage 加载演示数据库
 * 包含 images、aiConfigs、analyses 三个集合及自增 ID 计数器
 * 首次加载时会初始化默认数据
 */
function loadDemoDb() {
  const raw = localStorage.getItem(DEMO_DB_KEY);
  if (raw) {
    return JSON.parse(raw);
  }
  // 初始化演示数据：一个默认 AI 配置，空的图片和分析列表
  const initial = {
    images: [], // 模拟图片列表
    aiConfigs: [
      {
        id: 1,
        user_id: 1,
        config_name: "演示默认配置",
        provider: "cloud",
        base_url: "https://demo.example/v1",
        model_name: "demo-vision-model",
        is_default: 1,
        created_at: new Date().toISOString(),
      },
    ],
    analyses: [], // 模拟分析记录列表
    nextImageId: 1, // 下一张图片的自增 ID
    nextConfigId: 2, // 下一个配置的自增 ID
    nextAnalysisId: 1, // 下一条分析记录的自增 ID
  };
  localStorage.setItem(DEMO_DB_KEY, JSON.stringify(initial));
  return initial;
}

/**
 * 保存演示数据库到 localStorage
 * 每次 CRUD 操作后调用，保证数据持久化
 */
function saveDemoDb(db) {
  localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
}

/**
 * 根据分析类型生成演示分析结果
 * 不同的 analysis_type 返回不同字段子集（模拟后端行为）
 * @param {string} analysisType - 分析类型：all/describe/tags/scene/prompt
 * @returns {string} JSON 字符串格式的分析结果
 */
function buildDemoResult(analysisType) {
  const base = {
    description: "演示模式：一张包含主体对象和背景元素的图片。",
    tags: ["演示", "图像", "识别"],
    scene: "演示场景（室内或室外混合语义）",
    prompt: "high detail, cinematic lighting, realistic composition",
  };
  // 根据分析类型只保留相关字段，其他字段置空
  if (analysisType === "describe") {
    base.tags = [];
    base.scene = "";
    base.prompt = "";
  }
  if (analysisType === "tags") {
    base.description = "";
    base.scene = "";
    base.prompt = "";
  }
  if (analysisType === "scene") {
    base.description = "";
    base.tags = [];
    base.prompt = "";
  }
  if (analysisType === "prompt") {
    base.description = "";
    base.tags = [];
    base.scene = "";
  }
  return JSON.stringify(base);
}

/**
 * 演示模式请求处理器
 * 根据请求路径和方法，在 localStorage 中模拟后端的 CRUD 行为
 * 覆盖：/api/auth/me、/api/images、/api/ai-configs、/api/analysis 的全部接口
 * @param {string} path - 请求路径（如 "/api/images"）
 * @param {object} options - 请求选项（含 method、body 等）
 * @returns {Promise<any>} 模拟的响应数据，null 表示未匹配
 */
async function handleDemoRequest(path, options = {}) {
  const db = loadDemoDb();
  const method = (options.method || "GET").toUpperCase();

  // ---- 认证接口 ----
  if (path === "/api/auth/me" && method === "GET") {
    return { id: 1, username: "admin", created_at: new Date().toISOString() };
  }

  // ---- 图片接口 ----
  if (path === "/api/images" && method === "GET") {
    return db.images; // 返回图片列表
  }
  if (path === "/api/images" && method === "POST") {
    // 模拟上传图片：从 FormData 中取 file，生成图片记录
    const file = options.body?.get("file");
    const image = {
      id: db.nextImageId++,
      user_id: 1,
      filename: file?.name || `demo-${Date.now()}.png`,
      file_size: file?.size || 0,
      url: "/uploads/demo.png", // 演示模式下图片 URL 为固定值
      created_at: new Date().toISOString(),
    };
    db.images.unshift(image);
    saveDemoDb(db);
    return image;
  }
  if (path.startsWith("/api/images/") && method === "DELETE") {
    const id = Number(path.split("/").pop());
    db.images = db.images.filter((item) => item.id !== id);
    saveDemoDb(db);
    return { message: "删除成功" };
  }

  // ---- AI 配置接口 ----
  if (path === "/api/ai-configs" && method === "GET") {
    return db.aiConfigs;
  }
  if (path === "/api/ai-configs" && method === "POST") {
    const body = JSON.parse(options.body || "{}");
    // 如果新配置设为默认，先把其他配置取消默认
    if (body.is_default) {
      db.aiConfigs = db.aiConfigs.map((item) => ({ ...item, is_default: 0 }));
    }
    const config = {
      id: db.nextConfigId++,
      user_id: 1,
      config_name: body.config_name || "默认配置",
      provider: body.provider || "cloud",
      base_url: body.base_url || "",
      model_name: body.model_name || "",
      is_default: body.is_default ? 1 : 0,
      created_at: new Date().toISOString(),
    };
    db.aiConfigs.unshift(config);
    saveDemoDb(db);
    return config;
  }
  if (path.startsWith("/api/ai-configs/") && method === "PUT") {
    const id = Number(path.split("/").pop());
    const body = JSON.parse(options.body || "{}");
    if (body.is_default) {
      db.aiConfigs = db.aiConfigs.map((item) => ({ ...item, is_default: 0 }));
    }
    db.aiConfigs = db.aiConfigs.map((item) => (item.id === id ? { ...item, ...body } : item));
    saveDemoDb(db);
    return db.aiConfigs.find((item) => item.id === id);
  }
  if (path.startsWith("/api/ai-configs/") && method === "DELETE") {
    const id = Number(path.split("/").pop());
    db.aiConfigs = db.aiConfigs.filter((item) => item.id !== id);
    saveDemoDb(db);
    return { message: "删除成功" };
  }

  // ---- 分析记录接口 ----
  if (path === "/api/analysis" && method === "GET") {
    return db.analyses;
  }
  if (path === "/api/analysis" && method === "POST") {
    const body = JSON.parse(options.body || "{}");
    const record = {
      id: db.nextAnalysisId++,
      user_id: 1,
      image_id: body.image_id,
      provider: "cloud",
      model_name: "demo-vision-model",
      analysis_type: body.analysis_type || "all",
      result_json: buildDemoResult(body.analysis_type || "all"),
      latency: 0.3,
      created_at: new Date().toISOString(),
    };
    db.analyses.unshift(record);
    saveDemoDb(db);
    return record;
  }
  if (path.startsWith("/api/analysis/") && method === "PUT") {
    const id = Number(path.split("/").pop());
    const body = JSON.parse(options.body || "{}");
    db.analyses = db.analyses.map((item) => (item.id === id ? { ...item, ...body } : item));
    saveDemoDb(db);
    return db.analyses.find((item) => item.id === id);
  }
  if (path.startsWith("/api/analysis/") && method === "DELETE") {
    const id = Number(path.split("/").pop());
    db.analyses = db.analyses.filter((item) => item.id !== id);
    saveDemoDb(db);
    return { message: "删除成功" };
  }

  return null; // 未匹配任何演示接口
}

/**
 * 统一请求函数（核心）
 * 所有 API 模块都通过此函数发送请求
 *
 * 执行流程：
 * 1. 检查是否为演示模式 → 是则走 localStorage 模拟，直接返回
 * 2. 构建请求头，附加 Authorization: Bearer <token>
 * 3. 调用 fetch 发送真实 HTTP 请求
 * 4. 解析 JSON 响应体
 * 5. 处理 HTTP 错误（4xx/5xx），统一抛出 Error
 * 6. 401 错误时自动清除 token（触发后续请求自动跳转登录页）
 *
 * @param {string} path - API 路径（如 "/api/auth/login"）
 * @param {object} options - fetch 选项（method、headers、body 等）
 * @returns {Promise<any>} 后端返回的 JSON 数据
 */
export async function request(path, options = {}) {
  const token = getToken();

  // 演示模式拦截：优先走本地模拟，命中后直接返回，不发真实请求
  if (isDemoMode(token)) {
    const demoData = await handleDemoRequest(path, options);
    if (demoData !== null) {
      return demoData; // 演示数据命中，直接返回
    }
  }

  // 真实请求：构建 headers 并附加鉴权 token
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // 发送 HTTP 请求到后端
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // 解析响应体（仅当 Content-Type 为 JSON 时解析）
  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await response.json() : null;

  // 处理 HTTP 错误状态码
  if (!response.ok) {
    const message = normalizeError(data?.detail, `请求失败(${response.status})`);
    // 401 未授权：token 过期或无效，自动清除并引导重新登录
    if (response.status === 401) {
      clearToken();
    }
    throw new Error(message); // 抛出错误，由页面组件 catch 处理
  }

  return data; // 返回解析后的 JSON 数据
}
