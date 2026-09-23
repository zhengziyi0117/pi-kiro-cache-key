/**
 * kiro 反代把 metadata.user_id 当 prompt cache 的 key：没有它就完全忽略
 * cache_control，每轮重算整个 prompt。pi 的 buildParams 只在
 * options.metadata.user_id 存在时才发这个字段，而没人给它赋值。
 *
 * 这里按 Claude Code 的格式补上（device_id + session_id 的 JSON 串），
 * 用 pi 的 session id 当 session_id —— 会话内多轮命中，换会话重建。
 */

import { createHash } from "node:crypto";
import { hostname } from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** 走 anthropic-messages 且需要 user_id 当 cache key 的 provider。 */
const PROVIDERS = new Set(["kiro"]);

const deviceId = createHash("sha256").update(`pi:${hostname()}`).digest("hex");

export default function (pi: ExtensionAPI) {
	pi.on("before_provider_request", (event, ctx) => {
		if (!ctx.model || !PROVIDERS.has(ctx.model.provider)) return;

		const payload = event.payload;
		if (typeof payload !== "object" || payload === null) return;

		// 已经带了就不动（比如将来 pi 自己发了）
		const existing = (payload as { metadata?: { user_id?: unknown } }).metadata?.user_id;
		if (typeof existing === "string" && existing.length > 0) return;

		return {
			...payload,
			metadata: {
				user_id: JSON.stringify({
					device_id: deviceId,
					account_uuid: "",
					session_id: ctx.sessionManager.getSessionId(),
				}),
			},
		};
	});
}
