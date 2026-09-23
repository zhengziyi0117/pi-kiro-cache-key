# pi-kiro-cache-key

给 [pi](https://github.com/earendil-works/pi) 的扩展：为 Anthropic 兼容反代补上 `metadata.user_id`，让 prompt caching 生效。

## 为什么需要

部分 Anthropic 兼容反代（如 kiro 系）拿 `metadata.user_id` 当 prompt cache 的 key。缺这个字段，反代就无视 `cache_control`，每轮对话全量重算整个 prompt。pi 只在 `options.metadata.user_id` 有值时才发这个字段，而它默认没有赋值来源，所以缓存一直不命中。

实测（93k token 上下文）：

```
修复前   input=93,207  cacheWrite=0       cacheRead=0
修复后   input=0       cacheWrite=37,411  cacheRead=0       ← 第 1 轮建缓存
        input=0       cacheWrite=14      cacheRead=37,413  ← 第 2 轮命中
```

## 安装

```bash
curl -o ~/.pi/agent/extensions/kiro-cache-key.ts \
  https://raw.githubusercontent.com/zhengziyi0117/pi-kiro-cache-key/main/kiro-cache-key.ts
```

然后在 pi 里 `/reload`，或重启 pi。

## 配置

默认只对 provider 名为 `kiro` 的请求生效。换成你自己的 provider 名：

```ts
const PROVIDERS = new Set(["kiro"]);   // 改这里，可填多个
```

provider 名就是 `~/.pi/agent/models.json` 里 `providers` 下的键名。

## 生效确认

footer 会多出 `R`（cacheRead）、`W`（cacheWrite）、`CH`（命中率）三项：

```
↑876k ↓2.1k R37.4k W14 CH99.9% 9.3%/1.0M
```

## 说明

- `user_id` 格式照抄 Claude Code 实际发出的内容：`{"device_id":"...","account_uuid":"","session_id":"..."}`。
- `session_id` 用 pi 自己的 session id，所以缓存是会话级的 —— 会话内多轮命中，换会话重建。Claude Code 行为一致。
- `device_id` 是 hostname 的 sha256，不含任何凭证。
- payload 里已有 `metadata.user_id` 时不覆盖。

## License

MIT
