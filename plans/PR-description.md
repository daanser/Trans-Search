# PR: 添加 Reranker 重排功能

## 变更概述

搜索链路中引入独立的 reranker 模型，在向量检索召回 2n 条结果后，用 cross-encoder 重新排序，取前 n 条返回，提升搜索结果相关性。

## 搜索流程变更

```
用户请求 top_k=n
       ↓
向量搜索（混合/稠密）召回 2n 条结果
       ↓
BAAI/bge-reranker-v2-m3 对 2n 条结果逐对打分
       ↓
按 reranker 分数降序排列，取前 n 条返回
```

## 新增配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `RERANKER_API_KEY` | 同 `OPENAI_API_KEY` | 独立 API Key，已预先存入 Cloudflare Worker |
| `RERANKER_BASE_URL` | `https://api.siliconflow.cn/v1/` | Reranker 服务地址 |
| `RERANK_MODEL` | `BAAI/bge-reranker-v2-m3` | Reranker 模型 |
| `RERANK_ENABLED` | `true` | 可动态开关 |

- Reranker 使用**独立**的 API endpoint 和 Key，与 embed/LLM 分离
- `RERANKER_API_KEY` 已通过 `wrangler secret put` 存入 Cloudflare Worker
- 所有配置均可通过 `PATCH /config` 动态修改

## 修改文件

### 后端 (backend-cf)

| 文件 | 变更 |
|------|------|
| `src/rerank.ts` | **新增** — reranker 调用逻辑，带 15s 超时，支持独立 base_url/api_key |
| `src/types.ts` | Env 新增 `RERANKER_API_KEY`, `RERANKER_BASE_URL`, `RERANK_MODEL`, `RERANK_ENABLED`；ConfigUpdate 新增对应字段 |
| `src/config.ts` | Config 类新增 `reranker_base_url`, `rerank_model`, `rerank_enabled`；添加 `https://api.siliconflow.cn` 到 URL 白名单 |
| `src/index.ts` | 搜索流程集成 rerank（召回 2n → rerank → 取前 n）；`/stats` 返回 rerank 模型和状态 |

### 前端 (frontend)

| 文件 | 变更 |
|------|------|
| `pages/stats.vue` | 统计页新增「Rerank 模型」和「Rerank 重排」状态显示 |
| `composables/useApi.ts` | search 接口返回 `X-Expanded-Query` 响应头 |
| `pages/index.vue` | 搜索结果显示 LLM 扩展关键词 |

## 部署注意事项

1. 合并前确保 Cloudflare Worker 已配置 `RERANKER_API_KEY`：
   ```bash
   npx wrangler secret put RERANKER_API_KEY
   ```
   该 Key 已预先存入。

2. 合并后需手动触发部署：
   ```bash
   npx wrangler deploy
   ```

3. 部署后可通过 `PATCH /config` 动态调整 rerank 参数。
