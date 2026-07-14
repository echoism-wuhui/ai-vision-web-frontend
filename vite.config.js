/**
 * Vite 构建工具配置文件
 * 作用：告诉 Vite 如何编译和运行前端项目
 * - plugins: 使用 @vitejs/plugin-vue 插件，让 Vite 能识别和编译 .vue 单文件组件
 * - server.port: 开发服务器端口号设为 5173，启动后访问 http://localhost:5173 即可预览
 * - 其他配置（如代理、环境变量）可在此扩展，当前项目保持最简配置
 */
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  // 注册 Vue 插件：让 Vite 支持解析 .vue 文件中的 template/script/style
  plugins: [vue()],
  server: {
    port: 5173, // 开发服务器端口
  },
});
