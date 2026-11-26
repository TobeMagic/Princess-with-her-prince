const { chromium } = require('/Users/casperdai/Volumes/itfs/019ff4fe-5f70-708f-8f40-fa29fb2a8f97/repo/aimagciain_repo/motse-ai/luckee2.0/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright');
const { mkdirSync, writeFileSync, existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const BASE = 'http://34.143.132.97:6466';
const USER = 'Mario';
const PASSWORD = process.env.LUCKEE_EVAL_PASSWORD;
const OUT = process.env.EVAL_OUT_DIR || '/Users/casperdai/.codex/visualizations/2026/11/25/01a2109f-7b3c-7a63-a7a1-df61bd579d54/real-eval';
mkdirSync(OUT, { recursive: true });
const MODE = process.env.EVAL_MODE || 'all';
const GROUP = process.env.EVAL_GROUP || 'all';
const TIMEOUT_MS = Number(process.env.EVAL_TIMEOUT_MS || 210000);
const SKIP_DONE = process.env.EVAL_SKIP_DONE === '1';
const SKILLS = ['amazon-category-analysis','amazon-competitor-compare-report','amazon-listing-visual-strategy-luckee','amazon-review-scraper','html-to-pdf','launch-listing-package-orchestrator','listing-diagnosis','listing-diagnosis-orchestrator','listing-optimization-orchestrator','listing-sandbox-analyzer','luckee-plugin-smoke','select-ad-keywords','selection-business-analysis-orchestrator','selection-competitor-search','selection-m1-market-trend','selection-m2-competition-structure','selection-m3-seller-logistics','selection-m5-new-product-survival','selection-m6-benchmark-teardown','violation-detection'];
const MCP_PROMPTS = {
 'display-files':'请在当前主 Agent 真正调用 display-files 服务的 display_files 工具，登记一个文件 plugin-availability.txt，理由写“验证插件文件链路”；随后告诉我工具返回了什么。',
 'write-validated-json':'请在当前主 Agent 真正调用 write-validated-json 服务的 write_validated_json 工具，在当前工作目录写出 plugin-availability.json，payload 为 {"ok":true,"source":"luckee-plugin"}，schema 要求 ok 为 boolean；随后告诉我实际写入路径和工具返回。',
 'luckee_main_agent':'请在当前主 Agent 真正调用 luckee_main_agent 的 list_workspaces 工具，列出目前可见的商品工作区，并告诉我工具返回结构。',
 'lingxing':'请在当前主 Agent 真正调用 lingxing 的 list_lingxing_accounts 工具，列出可见领星账号或明确写出工具返回的限制；随后告诉我调用结果。',
 'amazon_ads_main':'请在当前主 Agent 真正调用 amazon_ads_main 的 list_campaigns_with_config 工具，使用当前账号可见的最小日期范围和 profile；如果缺参数，按工具提示补齐后再调用一次，并把最终工具返回告诉我。',
 'amazon-product':'请在当前主 Agent 真正调用 amazon-product 的 fetch_product 工具查询 ASIN B0GTK8MP5Y、站点 US；随后告诉我工具返回的商品字段或明确错误。',
 'sellersprite-mcp':'请在当前主 Agent 真正调用 sellersprite-mcp 中一个可用的商品/关键词查询工具，传入最小必要参数；告诉我你调用的工具名及返回结果。',
 'sorftime-mcp':'请在当前主 Agent 真正调用 sorftime-mcp 中一个可用的市场/商品查询工具，传入最小必要参数；告诉我你调用的工具名及返回结果。',
 'sif-mcp':'请在当前主 Agent 真正调用 sif-mcp 中一个可用的关键词或 ASIN 流量查询工具，传入最小必要参数；告诉我你调用的工具名及返回结果。'
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
function md5(s) { return crypto.createHash('md5').update(s).digest('hex'); }
function safe(s) { return String(s).replace(/[^a-z0-9._-]+/gi,'-').replace(/^-|-$/g,'').slice(0,80); }
function redact(s) { return String(s).replace(/(userToken|token|X-User-Token)=[^&\s"']+/gi,'$1=[redacted]').slice(0,500); }
function skillPrompt(slug) { return '请在当前主 Agent 中实际使用 ' + slug + ' 这个 skill 完成一次它能执行的最小真实任务：先按该 SKILL.md 的指示打开并执行必要的步骤/脚本/工具调用；如果任务需要外部参数，选一组最小、明确且安全的输入并在回复里注明。不要只描述技能内容，也不要只检查文件是否存在。请把实际调用过的工具或脚本名称、执行结果和输出路径（如果有）写入回复。'; }
async function login(page) {
 await page.goto(BASE + '/login?redirectUrl=%2F', { waitUntil:'domcontentloaded', timeout:90000 });
 await page.locator('#auth-username').fill(USER);
 await page.locator('#auth-password').fill(PASSWORD);
 const response = page.waitForResponse(r => r.url().includes('/login.do') && r.request().method() === 'POST', { timeout:60000 });
 await page.getByRole('button', { name:/^(sign in|登录)$/i }).click();
 const r = await response;
 const body = await r.json().catch(() => ({}));
 if (r.status() >= 400 || body?.code !== 200) throw new Error('login failed');
 await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout:120000 });
 return { token: body?.data?.token || '', userId: body?.data?.user?.id || '' };
}
async function cloudPrompts(page, session) {
 const url = BASE + '/__cloud/api/home-scenarios?' + new URLSearchParams({ type:'scenario', placement:'catalog', locale:'zh-CN', category:'all', page:'1', pageSize:'50' });
 const r = await page.request.get(url, { headers:{ 'Luckee-Authorization':session.token, 'x-user-token':session.token, 'X-User-Token':session.token } });
 const body = await r.json();
 return (body?.data?.items || []).filter(x => x.executionTarget === 'main-agent').map(x => ({ id:x.id, title:x.title, prompt:x.prompt, sourceId:x.id, promptHash:md5(x.prompt || '') }));
}
async function freshThread(page, prompt) {
 await page.goto(BASE + '/', { waitUntil:'domcontentloaded', timeout:90000 });
 await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes('home:') && (k.includes('draft') || k.includes('composer'))) localStorage.removeItem(k); });
 await page.reload({ waitUntil:'domcontentloaded', timeout:90000 });
 const composer = page.getByPlaceholder(/描述你想解决的问题|Ask a question/i);
 await composer.waitFor({ state:'visible', timeout:90000 });
 await page.waitForTimeout(1500);
 await composer.fill(prompt);
 const send = page.getByRole('button', { name:/发送消息|send message/i });
 await page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === '发送消息' || /send message/i.test(x.getAttribute('aria-label') || '')); return b && !b.disabled; }, null, { timeout:30000 }).catch(() => {});
 await send.click({ timeout:30000 });
 await page.waitForURL(u => u.pathname.includes('/workspace/main-agent/chat') && u.searchParams.has('thread_id'), { timeout:120000 });
 await page.waitForTimeout(1000);
 return page.url();
}
async function waitTerminal(page) {
 const deadline = Date.now() + TIMEOUT_MS;
 let lastLen = 0, stableSince = 0, snapshot = null;
 while (Date.now() < deadline) {
  const state = await page.evaluate(() => {
   const articles = [...document.querySelectorAll('article[class*="group/message"]')];
   const last = articles[articles.length - 1] || null;
   const role = last?.getAttribute('data-runtime-message-role');
   const text = last && role !== 'user' ? String(last.innerText || '').trim() : '';
   const roots = [...document.querySelectorAll('div')].filter(e => e.querySelector('article[class*="group/message"]') && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
   const chat = roots.sort((a,b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
   return { text, body:String(chat?.innerText || document.body.innerText || '').slice(-12000), count:articles.length, role };
  });
  const stop = await page.getByRole('button', { name:/停止生成|stop|Stop/i }).isVisible().catch(() => false);
  const waiting = /需要你的确认|等待回答|请选择|请选择巡检范围|确认后我会|等待你的|是否已确认|请确认|Need your confirmation|Waiting for your|Please select|请提供|请补充|输入.*ASIN|请输入/i.test(state.text + '\n' + state.body);
  const candidate = state.text.length > 30 ? state.text : (waiting ? state.body.slice(-3000) : '');
  if (candidate.length > 30 && candidate.length === lastLen) stableSince = stableSince || Date.now();
  else { lastLen = candidate.length; stableSince = 0; }
  snapshot = { ...state, stop, waiting };
  const stableMs = stableSince ? Date.now() - stableSince : 0;
  if (state.text.length > 30 && !stop && stableMs >= 6000) return { ok:true, text:state.text, visibleText:state.body, reason:waiting ? 'waiting-input' : 'assistant-final' };
  if (waiting && !stop && stableMs >= 4000) return { ok:true, text:candidate, visibleText:state.body, reason:'waiting-input' };
  await sleep(2000);
 }
 throw new Error('assistant reply timeout ' + JSON.stringify({ articleCount:snapshot?.count, role:snapshot?.role, stop:snapshot?.stop, waiting:snapshot?.waiting }));
}
async function captureThread(page, id) {
 const info = await page.evaluate(() => {
  const roots = [...document.querySelectorAll('div')].filter(e => { const st=getComputedStyle(e),rect=e.getBoundingClientRect(); return /(auto|scroll)/.test(st.overflowY) && e.querySelector('article[class*="group/message"]') && rect.width > 500; });
  const root = roots.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  if (!root) return { found:false };
  root.setAttribute('data-eval-thread-root','true');
  const rect = root.getBoundingClientRect(); const sh = Math.max(root.scrollHeight, root.clientHeight + 20);
  const prev = { height:root.style.height,maxHeight:root.style.maxHeight,overflow:root.style.overflow,scrollTop:root.scrollTop,bodyMinHeight:document.body.style.minHeight };
  root.style.height = sh + 'px'; root.style.maxHeight = 'none'; root.style.overflow = 'visible'; root.scrollTop = 0;
  document.body.style.minHeight = Math.max(document.body.scrollHeight, rect.top + sh + 200) + 'px';
  return { found:true, scrollHeight:sh, width:Math.round(rect.width), neededHeight:Math.ceil(rect.top + sh + 200), prev };
 });
 const screenshot = path.join(OUT, id + '-thread-full.png');
 const oldViewport = page.viewportSize();
 if (info.found) await page.setViewportSize({ width:1440, height:Math.max(900, Math.min(16000, info.neededHeight)) });
 await sleep(500);
 await page.screenshot({ path:screenshot, fullPage:true, animations:'disabled' });
 if (info.found) await page.evaluate(prev => { const root=document.querySelector('[data-eval-thread-root="true"]'); if(root){root.style.height=prev.height;root.style.maxHeight=prev.maxHeight;root.style.overflow=prev.overflow;root.scrollTop=prev.scrollTop;root.removeAttribute('data-eval-thread-root');} document.body.style.minHeight=prev.bodyMinHeight; }, info.prev);
 if (oldViewport) await page.setViewportSize(oldViewport);
 return { mode:info.found ? 'fullPageThread' : 'fallbackFullPage', screenshot, scrollHeight:info.scrollHeight || null, width:info.width || null };
}
function resultPath(id) { return path.join(OUT, id + '-result.json'); }
async function runCase(page, c) {
 const existing = resultPath(c.id);
 if (SKIP_DONE && existsSync(existing)) { const d=JSON.parse(readFileSync(existing,'utf8')); if(d.ok && d.screenshot?.screenshot && existsSync(d.screenshot.screenshot)) return { ...d, skipped:true }; }
 const result = { ...c, at:new Date().toISOString(), base:BASE, user:USER, ok:false };
 const consoleErrors=[], pageErrors=[], badResponses=[];
 const onConsole = m => { if(m.type()==='error') consoleErrors.push(redact(m.text())); };
 const onPage = e => pageErrors.push(redact(e.message));
 const onResponse = r => { if(r.status()>=400) badResponses.push({ status:r.status(), url:redact(r.url()) }); };
 page.on('console',onConsole); page.on('pageerror',onPage); page.on('response',onResponse);
 try {
  result.threadUrl = await freshThread(page,c.prompt);
  result.promptHash = md5(c.prompt);
  let terminal = await waitTerminal(page);
  result.initialReply = terminal.text;
  if(c.group==='template' && (terminal.reason==='waiting-input' || /请提供|请补充|请输入|请选择|需要你的确认|是否确认|站点|市场|ASIN|范围/i.test(terminal.text))){const followup='按最小可用输入继续：站点/市场=US，范围=全部可见店铺与全部商品，统计窗口=近7日对比上7日，ASIN=B0GTK8MP5Y，类目=家居，预算=1000美元；请直接按这些已确认参数继续执行，不再追问，并给出完整结果。';const composer=page.getByPlaceholder(/给工作区发送消息|send message to workspace/i);if(await composer.count()){await composer.fill(followup);await page.getByRole('button',{name:/发送消息|send message/i}).click();await page.waitForTimeout(1200);terminal=await waitTerminal(page);result.followup=followup;}}
  result.reply = terminal.text; result.visibleText = terminal.visibleText; result.terminalReason = terminal.reason; result.turnComplete = true;
  await sleep(800);
  result.screenshot = await captureThread(page,c.id);
  result.consoleErrors=consoleErrors; result.pageErrors=pageErrors; result.badResponses=badResponses;
  result.ok = !!result.reply && !!result.screenshot?.screenshot && pageErrors.length === 0;
 } catch(e) {
  result.error=e instanceof Error?e.message:String(e); result.consoleErrors=consoleErrors; result.pageErrors=pageErrors; result.badResponses=badResponses;
  try { result.screenshot=await captureThread(page,c.id); } catch(x) { result.screenshotError=String(x); }
 } finally {
  page.off('console',onConsole); page.off('pageerror',onPage); page.off('response',onResponse);
  writeFileSync(existing,JSON.stringify(result,null,2));
 }
 return result;
}
(async()=>{
 if(!PASSWORD) throw new Error('missing password');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const session=await login(page);
 const templates=await cloudPrompts(page,session);
 const skillCases=SKILLS.map(slug=>({group:'skill',id:'skill-'+safe(slug),name:slug,prompt:skillPrompt(slug)}));
 const mcpCases=Object.entries(MCP_PROMPTS).map(([name,prompt])=>({group:'mcp',id:'mcp-'+safe(name),name,prompt}));
 const templateCases=templates.map(t=>({group:'template',id:'template-'+safe(t.id),name:t.title||t.id,prompt:t.prompt,sourceId:t.id,promptHash:t.promptHash}));
 const groups={skill:skillCases,mcp:mcpCases,template:templateCases,all:[...skillCases,...mcpCases,...templateCases]};
 let cases=groups[GROUP]||groups.all;
 if(MODE==='first')cases=cases.slice(0,1);const rerunFile=path.join(OUT,'rerun-ids.json');if(existsSync(rerunFile)){const ids=new Set(JSON.parse(readFileSync(rerunFile,'utf8')));cases=cases.filter(c=>ids.has(c.id));}
 const results=[];
 for(const c of cases){const r=await runCase(page,c);results.push({id:r.id,name:r.name,group:r.group,ok:r.ok,skipped:!!r.skipped,error:r.error||null,replyLength:r.reply?.length||0,screenshot:r.screenshot?.screenshot||null,threadUrl:r.threadUrl||null,terminalReason:r.terminalReason||null});console.log(JSON.stringify({done:r.id,ok:r.ok,skipped:!!r.skipped,error:r.error||null,replyLength:r.reply?.length||0,screenshot:r.screenshot?.screenshot||null}));}
 const summaryPath=path.join(OUT,'summary-'+GROUP+'-'+MODE+'.json');
 writeFileSync(summaryPath,JSON.stringify({at:new Date().toISOString(),mode:MODE,group:GROUP,caseCount:cases.length,cloudTemplateCount:templates.length,results},null,2));
 console.log(JSON.stringify({summary:summaryPath,passed:results.filter(x=>x.ok).length,total:cases.length}));
 await browser.close();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
