module.exports=[870722,(e,t,r)=>{t.exports=e.x("tty",()=>require("tty"))},137464,(e,t,r)=>{t.exports=e.x("timers",()=>require("timers"))},81111,(e,t,r)=>{t.exports=e.x("node:stream",()=>require("node:stream"))},755004,(e,t,r)=>{t.exports=e.x("tls",()=>require("tls"))},504446,(e,t,r)=>{t.exports=e.x("net",()=>require("net"))},679594,(e,t,r)=>{t.exports=e.x("dns",()=>require("dns"))},347299,(e,t,r)=>{t.exports=e.x("node:http",()=>require("node:http"))},743698,(e,t,r)=>{t.exports=e.x("node:https",()=>require("node:https"))},727028,(e,t,r)=>{t.exports=e.x("node:zlib",()=>require("node:zlib"))},921517,(e,t,r)=>{t.exports=e.x("http",()=>require("http"))},524836,(e,t,r)=>{t.exports=e.x("https",()=>require("https"))},792509,(e,t,r)=>{t.exports=e.x("url",()=>require("url"))},666680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},233405,(e,t,r)=>{t.exports=e.x("child_process",()=>require("child_process"))},523862,(e,t,r)=>{t.exports=e.x("dgram",()=>require("dgram"))},812057,(e,t,r)=>{t.exports=e.x("node:util",()=>require("node:util"))},687769,(e,t,r)=>{t.exports=e.x("node:events",()=>require("node:events"))},660526,(e,t,r)=>{t.exports=e.x("node:os",()=>require("node:os"))},59639,(e,t,r)=>{t.exports=e.x("node:process",()=>require("node:process"))},912714,(e,t,r)=>{t.exports=e.x("node:fs/promises",()=>require("node:fs/promises"))},874533,(e,t,r)=>{t.exports=e.x("node:child_process",()=>require("node:child_process"))},857764,(e,t,r)=>{t.exports=e.x("node:url",()=>require("node:url"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},427699,(e,t,r)=>{t.exports=e.x("events",()=>require("events"))},688947,(e,t,r)=>{t.exports=e.x("stream",()=>require("stream"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},612249,(e,t,r)=>{t.exports=e.x("constants",()=>require("constants"))},449719,(e,t,r)=>{t.exports=e.x("assert",()=>require("assert"))},500874,(e,t,r)=>{t.exports=e.x("buffer",()=>require("buffer"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},99348,(e,t,r)=>{t.exports=e.x("string_decoder",()=>require("string_decoder"))},193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},993833,e=>{"use strict";function t(e){if(e.startsWith("DW:")){let t=e.slice(3),r=t.indexOf("|||");if(-1!==r){let e=t.slice(0,r).replace(/'/g,"''"),s=t.slice(r+3).replace(/'/g,"''");return`pt_desc2 = N'${e}' AND pt_desc1 = N'${s}' AND m_part LIKE '143%'`}let s=t.replace(/'/g,"''");return`pt_desc2 = N'${s}' AND m_part LIKE '143%'`}let t=e.replace(/'/g,"''");return`pt_desc1 = N'${t}'`}e.s(["buildProductFilter",()=>t])},744741,e=>{"use strict";var t=e.i(747909),r=e.i(174017),s=e.i(996250),o=e.i(759756),n=e.i(561916),a=e.i(174677),i=e.i(869741),p=e.i(316795),d=e.i(487718),u=e.i(995169),l=e.i(47587),c=e.i(666012),_=e.i(570101),R=e.i(626937),E=e.i(10372),x=e.i(193695);e.i(52474);var m=e.i(600220),h=e.i(89171),q=e.i(675705),T=e.i(993833);async function N(e,t,r){let s=Date.now();try{let o=await t();return{name:e,elapsedMs:Date.now()-s,rows:r?r(o):void 0}}catch(t){return{name:e,elapsedMs:Date.now()-s,error:t instanceof Error?t.message:"Unknown error"}}}async function O(e){let{searchParams:t}=new URL(e.url),r=t.get("product"),s=t.get("startDate"),o=t.get("endDate");if(!r||!s||!o)return h.NextResponse.json({error:"product, startDate, and endDate are required"},{status:400});let n=await (0,q.getConnection)(),a=(0,T.buildProductFilter)(r),i=`AND m_date >= '${s}' AND m_date <= '${o}'`,p=`${a} ${i}`,d=[];d.push(await N("sql_count_filtered_rows",()=>n.request().query(`
            SELECT COUNT_BIG(*) AS filteredRows
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE ${p}
            OPTION (RECOMPILE)
        `),e=>Number(e.recordset[0]?.filteredRows||0))),d.push(await N("sql_count_grouped_jobs",()=>n.request().query(`
            SELECT COUNT_BIG(*) AS groupedJobs
            FROM (
                SELECT m_doc, m_job, CAST(m_date AS date) AS m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp))) AS m_cp
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${p}
                GROUP BY m_doc, m_job, CAST(m_date AS date), m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
            ) AS grouped
            OPTION (RECOMPILE)
        `),e=>Number(e.recordset[0]?.groupedJobs||0))),d.push(await N("sql_count_reason_rows",()=>n.request().query(`
            SELECT COUNT_BIG(*) AS reasonRows
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE ${p}
                AND rsn_desc IS NOT NULL
                AND RTRIM(LTRIM(rsn_desc)) != ''
            OPTION (RECOMPILE)
        `),e=>Number(e.recordset[0]?.reasonRows||0))),d.push(await N("sql_metrics_aggregate",()=>n.request().query(`
            SELECT
                computed_cp AS m_cp,
                SUM(qtyp) AS totalQtyp,
                SUM(qtycomp) AS totalQtycomp,
                SUM(qtyscrp) AS totalScrap,
                SUM(qtyrjct) AS totalReject
            FROM (
                SELECT
                    m_doc, m_job, m_date, m_kiln,
                    CASE
                        WHEN MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) = 1
                        THEN CASE
                            WHEN UPPER(RTRIM(LTRIM(m_cp))) = 'C' THEN 'C1'
                            ELSE UPPER(RTRIM(LTRIM(m_cp))) + ' (Round 1)'
                        END
                        ELSE UPPER(RTRIM(LTRIM(m_cp)))
                    END AS computed_cp,
                    MAX(qtyp) AS qtyp,
                    MAX(qtycomp) AS qtycomp,
                    MAX(qtyscrp) AS qtyscrp,
                    MAX(qtyrjct) AS qtyrjct
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${p}
                GROUP BY m_doc, m_job, m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))
            ) AS unique_jobs
            GROUP BY computed_cp
            OPTION (RECOMPILE)
        `),e=>e.recordset.length)),d.push(await N("sql_reasons_aggregate",()=>n.request().query(`
            SELECT computed_cp AS m_cp, sub_typ, rsn_desc, SUM(sub_qty) AS sub_qty
            FROM (
                SELECT
                    RTRIM(LTRIM(sub_typ)) AS sub_typ,
                    RTRIM(LTRIM(rsn_desc)) AS rsn_desc,
                    sub_qty,
                    CASE
                        WHEN MAX(CASE WHEN m_user LIKE 'somboon%' THEN 1 ELSE 0 END) OVER (PARTITION BY m_doc, m_job, m_date, m_kiln, UPPER(RTRIM(LTRIM(m_cp)))) = 1
                        THEN CASE
                            WHEN UPPER(RTRIM(LTRIM(m_cp))) = 'C' THEN 'C1'
                            ELSE UPPER(RTRIM(LTRIM(m_cp))) + ' (Round 1)'
                        END
                        ELSE UPPER(RTRIM(LTRIM(m_cp)))
                    END AS computed_cp
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${p}
            ) AS t
            WHERE rsn_desc IS NOT NULL AND rsn_desc != ''
                AND (sub_typ IS NOT NULL OR computed_cp LIKE '%(Round 1)%' OR computed_cp = 'C1')
            GROUP BY computed_cp, sub_typ, rsn_desc
            OPTION (RECOMPILE)
        `),e=>e.recordset.length)),d.push(await N("sql_info_lookup",()=>n.request().query(`
            SELECT TOP 1 pt_desc1, pt_desc2, m_part
            FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
            WHERE ${a}
            OPTION (RECOMPILE)
        `),e=>e.recordset.length));let u=[];return d.push(await N("sql_fetch_raw_columns",async()=>{let e=await n.request().query(`
                SELECT
                    m_doc, m_job, m_date, m_kiln,
                    m_cp, m_user,
                    qtyp, qtycomp, qtyscrp, qtyrjct,
                    sub_typ, sub_qty, rsn_desc,
                    pt_desc1, pt_desc2, m_part
                FROM dbo.v_rpt_sort_1 WITH (NOLOCK)
                WHERE ${p}
                OPTION (RECOMPILE)
            `);return u=e.recordset,e},e=>e.recordset.length)),d.push(await N("node_group_raw_rows",async()=>{let e=new Map;for(let t of u){let r=String(t.m_date).split("T")[0],s=String(t.m_cp||"").trim().toUpperCase(),o=`${t.m_doc}|${t.m_job}|${r}|${t.m_kiln}|${s}`;e.set(o,(e.get(o)||0)+1)}return e},e=>e.size)),h.NextResponse.json({product:r,startDate:s,endDate:o,totalElapsedMs:d.reduce((e,t)=>e+t.elapsedMs,0),steps:d})}e.s(["GET",()=>O],175974);var g=e.i(175974);let y=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/diagnostics/product-stats/route",pathname:"/api/diagnostics/product-stats",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/diagnostics/product-stats/route.ts",nextConfigOutput:"standalone",userland:g}),{workAsyncStorage:S,workUnitAsyncStorage:A,serverHooks:C}=y;function I(){return(0,s.patchFetch)({workAsyncStorage:S,workUnitAsyncStorage:A})}async function M(e,t,s){y.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/diagnostics/product-stats/route";h=h.replace(/\/index$/,"")||"/";let q=await y.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!q)return t.statusCode=400,t.end("Bad Request"),null==s.waitUntil||s.waitUntil.call(s,Promise.resolve()),null;let{buildId:T,params:N,nextConfig:O,parsedUrl:g,isDraftMode:S,prerenderManifest:A,routerServerContext:C,isOnDemandRevalidate:I,revalidateOnlyGenerated:M,resolvedPathname:f,clientReferenceManifest:v,serverActionsManifest:w}=q,b=(0,i.normalizeAppPath)(h),P=!!(A.dynamicRoutes[b]||A.routes[f]),L=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,g,!1):t.end("This page could not be found"),null);if(P&&!S){let e=!!A.routes[f],t=A.dynamicRoutes[b];if(t&&!1===t.fallback&&!e){if(O.experimental.adapterPath)return await L();throw new x.NoFallbackError}}let H=null;!P||y.isDev||S||(H="/index"===(H=f)?"/":H);let U=!0===y.isDev||!P,D=P&&!U;w&&v&&(0,a.setManifestsSingleton)({page:h,clientReferenceManifest:v,serverActionsManifest:w});let j=e.method||"GET",k=(0,n.getTracer)(),$=k.getActiveScopeSpan(),W={params:N,prerenderManifest:A,renderOpts:{experimental:{authInterrupts:!!O.experimental.authInterrupts},cacheComponents:!!O.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:O.cacheLife,waitUntil:s.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,s,o)=>y.onRequestError(e,t,s,o,C)},sharedContext:{buildId:T}},F=new p.NodeNextRequest(e),K=new p.NodeNextResponse(t),B=d.NextRequestAdapter.fromNodeNextRequest(F,(0,d.signalFromNodeResponse)(t));try{let a=async e=>y.handle(B,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=k.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=r.get("next.route");if(s){let t=`${j} ${s}`;e.setAttributes({"next.route":s,"http.route":s,"next.span_name":t}),e.updateName(t)}else e.updateName(`${j} ${h}`)}),i=!!(0,o.getRequestMeta)(e,"minimalMode"),p=async o=>{var n,p;let d=async({previousCacheEntry:r})=>{try{if(!i&&I&&M&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await a(o);e.fetchMetrics=W.renderOpts.fetchMetrics;let p=W.renderOpts.pendingWaitUntil;p&&s.waitUntil&&(s.waitUntil(p),p=void 0);let d=W.renderOpts.collectedTags;if(!P)return await (0,c.sendResponse)(F,K,n,W.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(n.headers);d&&(t[E.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,s=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:m.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:s}}}}catch(t){throw(null==r?void 0:r.isStale)&&await y.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:I})},!1,C),t}},u=await y.handleResponse({req:e,nextConfig:O,cacheKey:H,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:I,revalidateOnlyGenerated:M,responseGenerator:d,waitUntil:s.waitUntil,isMinimalMode:i});if(!P)return null;if((null==u||null==(n=u.value)?void 0:n.kind)!==m.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(p=u.value)?void 0:p.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",I?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),S&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let x=(0,_.fromNodeOutgoingHttpHeaders)(u.value.headers);return i&&P||x.delete(E.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||x.get("Cache-Control")||x.set("Cache-Control",(0,R.getCacheControlHeader)(u.cacheControl)),await (0,c.sendResponse)(F,K,new Response(u.value.body,{headers:x,status:u.value.status||200})),null};$?await p($):await k.withPropagatedContext(e.headers,()=>k.trace(u.BaseServerSpan.handleRequest,{spanName:`${j} ${h}`,kind:n.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},p))}catch(t){if(t instanceof x.NoFallbackError||await y.onRequestError(e,t,{routerKind:"App Router",routePath:b,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:I})},!1,C),P)throw t;return await (0,c.sendResponse)(F,K,new Response(null,{status:500})),null}}e.s(["handler",()=>M,"patchFetch",()=>I,"routeModule",()=>y,"serverHooks",()=>C,"workAsyncStorage",()=>S,"workUnitAsyncStorage",()=>A],744741)},33779,e=>{e.v(t=>Promise.all(["server/chunks/[root-of-the-server]__347657e3._.js"].map(t=>e.l(t))).then(()=>t(456261)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__e416e24b._.js.map