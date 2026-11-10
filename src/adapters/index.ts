import amazonAdapter from "../../adapters/amazon.json";
import taobaoAdapter from "../../adapters/taobao.json";
import bbcAdapter from "../../adapters/bbc.json";
import guardianAdapter from "../../adapters/guardian.json";
import bilibiliAdapter from "../../adapters/bilibili.json";
import caixinAdapter from "../../adapters/caixin.json";
import youtubeAdapter from "../../adapters/youtube.json";
import redditAdapter from "../../adapters/reddit.json";
import weiboAdapter from "../../adapters/weibo.json";
import xiaohongshuAdapter from "../../adapters/xiaohongshu.json";
import googleAdapter from "../../adapters/google.json";
import baiduAdapter from "../../adapters/baidu.json";
import type { PageContext, Resolver } from "../engine/types";
import type { Adapter, Component } from "../rules/types";
import { normalizeHost } from "../shared/settings";

export const adapters = [
  googleAdapter,
  baiduAdapter,
  amazonAdapter,
  taobaoAdapter,
  bbcAdapter,
  guardianAdapter,
  bilibiliAdapter,
  caixinAdapter,
  youtubeAdapter,
  redditAdapter,
  weiboAdapter,
  xiaohongshuAdapter,
] as unknown as Adapter[];

/** Adapter for a host, matching the host itself or its subdomains. */
export function findAdapter(host: string, list: Adapter[] = adapters): Adapter | null {
  const h = normalizeHost(host);
  if (!h) return null;
  return (
    list.find((a) =>
      a.hosts.some((x) => {
        const ah = normalizeHost(x);
        return ah !== null && (h === ah || h.endsWith(`.${ah}`));
      }),
    ) ?? null
  );
}

/** Finds the elements of a component using the adapter's selectors. A bad selector is ignored. */
export function createResolver(adapter: Adapter | null, doc: Document): Resolver {
  return (component: Component) => {
    const found = new Set<Element>();
    for (const entry of adapter?.components ?? []) {
      if (entry.component !== component) continue;
      for (const sel of entry.selectors) {
        try {
          doc.querySelectorAll(sel).forEach((el) => found.add(el));
        } catch {
          /* invalid selector: skip it */
        }
      }
    }
    return [...found];
  };
}

/** What the engine may assume about this page, from the adapter only (the analyzer comes in B5). */
export function buildContext(
  adapter: Adapter | null,
  doc: Document,
  pathname: string,
  width: number,
): PageContext {
  const ctx: PageContext = { pageType: "any", components: {}, viewportWidth: width };
  if (!adapter) return ctx;
  for (const hint of adapter.pageTypeHints) {
    try {
      if (new RegExp(hint.urlPattern).test(pathname)) {
        ctx.pageType = hint.pageType;
        break;
      }
    } catch {
      /* invalid pattern: skip it */
    }
  }
  const resolve = createResolver(adapter, doc);
  for (const entry of adapter.components) {
    if (resolve(entry.component).length > 0) ctx.components[entry.component] = entry.confidence;
  }
  return ctx;
}
