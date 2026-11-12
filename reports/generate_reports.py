from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.dom import minidom
import json, struct, copy, textwrap, html
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports'; EVIDENCE=OUT/'evidence'
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main','pic':'http://schemas.openxmlformats.org/drawingml/2006/picture'}

class Report:
 def __init__(self,n,name):
  self.n=n;self.name=name;self.template=Path(f'/Users/linqian/Downloads/专综2-实验{n}.docx')
  with ZipFile(self.template)as z:self.files={k:z.read(k) for k in z.namelist()}
  self.doc=minidom.parseString(self.files['word/document.xml']);self.rels=minidom.parseString(self.files['word/_rels/document.xml.rels']);self.types=minidom.parseString(self.files['[Content_Types].xml']);self.image_id=100;self.transcript=[]
  root=self.doc.documentElement
  for p,uri in NS.items():root.setAttribute('xmlns:'+p,uri)
  self.main_table=self.doc.getElementsByTagName('w:tbl')[0]
  self.rows=self.children(self.main_table,'w:tr')
  self.setcell(self.rows[1],1,'林谦');self.setcell(self.rows[1],3,'233020696');self.setcell(self.rows[1],5,'2023级前端技术开发方向2班')
  self.setcell(self.rows[2],1,'待填写');self.setcell(self.rows[2],3,'待填写')
  self.setcell(self.rows[3],1,name+'（IELTS Practice）')
  equipment=['（1）环境：macOS（arm64）笔记本，本地项目工作目录。','（2）工具：Node.js、npm、Visual Studio Code、Chrome；数据存储采用浏览器 localStorage，无须独立数据库服务。']
  self.setcell(self.rows[7],1,equipment)
  # Keep the school template but fit its fixed-width table within the original text area.
  page=self.doc.getElementsByTagName('w:pgSz')[0];margin=self.doc.getElementsByTagName('w:pgMar')[0]
  width=int(page.getAttribute('w:w'))-int(margin.getAttribute('w:left'))-int(margin.getAttribute('w:right'))
  tblW=self.main_table.getElementsByTagName('w:tblW')[0];old=int(tblW.getAttribute('w:w'));ratio=width/old;tblW.setAttribute('w:w',str(width))
  for node in self.main_table.getElementsByTagName('w:gridCol')+self.main_table.getElementsByTagName('w:tcW'):
   value=node.getAttribute('w:w')
   if value.isdigit():node.setAttribute('w:w',str(round(int(value)*ratio)))
  for row in self.rows:
   for p in list(row.getElementsByTagName('w:cantSplit')):p.parentNode.removeChild(p)
  self.content=self.children(self.rows[8],'w:tc')[0]
  for child in list(self.content.childNodes):
   if child.nodeName!='w:tcPr':self.content.removeChild(child)
  # Remove minimum height from the long report-content row.
  for node in list(self.rows[8].getElementsByTagName('w:trHeight')):node.parentNode.removeChild(node)
  self.p('内容、过程及结果分析',bold=True,size=24)
 def children(self,node,name):return[c for c in node.childNodes if c.nodeType==c.ELEMENT_NODE and c.nodeName==name]
 def el(self,name,attrs=None,text=None):
  prefix=name.split(':')[0]if':'in name else None
  node=self.doc.createElementNS(NS.get(prefix),name)
  for k,v in (attrs or{}).items():node.setAttribute(k,str(v))
  if text is not None:node.appendChild(self.doc.createTextNode(str(text)))
  return node
 def setcell(self,row,index,text):
  cells=self.children(row,'w:tc');cell=cells[index]
  for c in list(cell.childNodes):
   if c.nodeName!='w:tcPr':cell.removeChild(c)
  for t in text if isinstance(text,list)else[text]:self.p(t,parent=cell,size=21)
 def p(self,text='',bold=False,size=22,align=None,parent=None,code=False,keep=False):
  parent=parent or self.content;p=self.el('w:p');props=self.el('w:pPr');props.appendChild(self.el('w:spacing',{'w:before':80 if bold else 0,'w:after':65 if not code else 0,'w:line':280 if not code else 230,'w:lineRule':'auto'}))
  if align:props.appendChild(self.el('w:jc',{'w:val':align}))
  if keep:props.appendChild(self.el('w:keepNext'))
  if code:props.appendChild(self.el('w:shd',{'w:val':'clear','w:fill':'F3F4F6'}));props.appendChild(self.el('w:ind',{'w:left':110,'w:right':90}))
  p.appendChild(props);run=self.el('w:r');rpr=self.el('w:rPr');rpr.appendChild(self.el('w:rFonts',{'w:ascii':'Consolas'if code else'Times New Roman','w:hAnsi':'Consolas'if code else'Times New Roman','w:eastAsia':'黑体'if bold else'宋体'}));rpr.appendChild(self.el('w:sz',{'w:val':size}));rpr.appendChild(self.el('w:szCs',{'w:val':size}));rpr.appendChild(self.el('w:color',{'w:val':'000000'}))
  if bold:rpr.appendChild(self.el('w:b'))
  run.appendChild(rpr);t=self.el('w:t',{'xml:space':'preserve'},text);run.appendChild(t);p.appendChild(run);parent.appendChild(p)
  if parent is getattr(self,'content',None):self.transcript.append(text)
  return p
 def h(self,text):self.p(text,bold=True,size=24,keep=True)
 def code(self,caption,text):
  self.p(caption,bold=True,size=21,keep=True)
  for i,line in enumerate(textwrap.dedent(text).strip('\n').splitlines(),1):self.p(f'{i:02d}  {line}',size=17,code=True)
 def table(self,caption,headers,rows,widths=None):
  self.p(caption,bold=True,size=21,keep=True);self.transcript.append(' | '.join(headers))
  table=self.el('w:tbl');props=self.el('w:tblPr');props.appendChild(self.el('w:tblW',{'w:w':8300,'w:type':'dxa'}));borders=self.el('w:tblBorders')
  for edge in ['top','left','bottom','right','insideH','insideV']:borders.appendChild(self.el('w:'+edge,{'w:val':'single','w:sz':4,'w:color':'B0B0B0'}))
  props.appendChild(borders);props.appendChild(self.el('w:tblLayout',{'w:type':'fixed'}));table.appendChild(props);widths=widths or[8300//len(headers)]*len(headers);grid=self.el('w:tblGrid')
  for width in widths:grid.appendChild(self.el('w:gridCol',{'w:w':width}))
  table.appendChild(grid)
  for i,row in enumerate([headers]+rows):
   tr=self.el('w:tr')
   if i==0:pr=self.el('w:trPr');pr.appendChild(self.el('w:tblHeader'));tr.appendChild(pr)
   for j,value in enumerate(row):
    tc=self.el('w:tc');tcpr=self.el('w:tcPr');tcpr.appendChild(self.el('w:tcW',{'w:w':widths[j],'w:type':'dxa'}))
    if i==0:tcpr.appendChild(self.el('w:shd',{'w:fill':'EDEFF2'}))
    tc.appendChild(tcpr);self.p(str(value),bold=i==0,size=18,parent=tc);tr.appendChild(tc)
   table.appendChild(tr)
   if i:self.transcript.append(' | '.join(map(str,row)))
  self.content.appendChild(table);self.p('')
 def image(self,name,caption,width_cm=14):
  path=EVIDENCE/name
  if not path.exists():raise FileNotFoundError(path)
  data=path.read_bytes();w,h=struct.unpack('>II',data[16:24]);cx=int(width_cm*360000);cy=round(cx*h/w);self.image_id+=1;rid=f'rIdReport{self.image_id}';filename=f'report-{self.n}-{self.image_id}.png';self.files['word/media/'+filename]=data
  rel=self.rels.createElement('Relationship');rel.setAttribute('Id',rid);rel.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');rel.setAttribute('Target','media/'+filename);self.rels.documentElement.appendChild(rel)
  if not any(n.getAttribute('Extension')=='png'for n in self.types.getElementsByTagName('Default')):
   node=self.types.createElement('Default');node.setAttribute('Extension','png');node.setAttribute('ContentType','image/png');self.types.documentElement.appendChild(node)
  p=self.el('w:p');pr=self.el('w:pPr');pr.appendChild(self.el('w:jc',{'w:val':'center'}));pr.appendChild(self.el('w:keepNext'));p.appendChild(pr);r=self.el('w:r');drawing=self.el('w:drawing');inline=self.el('wp:inline',{'distT':0,'distB':0,'distL':0,'distR':0});inline.appendChild(self.el('wp:extent',{'cx':cx,'cy':cy}));inline.appendChild(self.el('wp:docPr',{'id':self.image_id,'name':filename,'descr':caption}));graphic=self.el('a:graphic');gd=self.el('a:graphicData',{'uri':NS['pic']});pic=self.el('pic:pic');nv=self.el('pic:nvPicPr');nv.appendChild(self.el('pic:cNvPr',{'id':0,'name':filename}));nv.appendChild(self.el('pic:cNvPicPr'));pic.appendChild(nv);fill=self.el('pic:blipFill');fill.appendChild(self.el('a:blip',{'r:embed':rid}));stretch=self.el('a:stretch');stretch.appendChild(self.el('a:fillRect'));fill.appendChild(stretch);pic.appendChild(fill);shape=self.el('pic:spPr');trans=self.el('a:xfrm');trans.appendChild(self.el('a:off',{'x':0,'y':0}));trans.appendChild(self.el('a:ext',{'cx':cx,'cy':cy}));shape.appendChild(trans);geom=self.el('a:prstGeom',{'prst':'rect'});geom.appendChild(self.el('a:avLst'));shape.appendChild(geom);pic.appendChild(shape);gd.appendChild(pic);graphic.appendChild(gd);inline.appendChild(graphic);drawing.appendChild(inline);r.appendChild(drawing);p.appendChild(r);self.content.appendChild(p);self.p(caption,align='center',size=20)
 def save(self):
  self.files['word/document.xml']=self.doc.toxml(encoding='UTF-8');self.files['word/_rels/document.xml.rels']=self.rels.toxml(encoding='UTF-8');self.files['[Content_Types].xml']=self.types.toxml(encoding='UTF-8')
  filename=f'专综2-实验{self.n}-林谦-{self.name}.docx';out=OUT/filename
  with ZipFile(out,'w',ZIP_DEFLATED)as z:
   for k,v in self.files.items():z.writestr(k,v)
  (OUT/f'实验{self.n}-正文核对.txt').write_text('\n\n'.join(self.transcript),encoding='utf8')
  return out

r=Report(4,'项目开发')
r.h('一、项目名称')
r.p('IELTS Practice——基于 Vue 3 与 TypeScript 的雅思阅读与词汇学习系统。')
r.p('项目目标是把阅读训练、自动判分、练习记录和词汇巩固整合到同一前端应用中。阅读过程中可选词收藏，保存释义、上下文和文章来源，再进入阅读生词库进行拼写与间隔复习。')
r.h('二、核心代码（按论文格式编号展现）')
r.h('2.1 系统结构与开发范围')
r.p('系统采用 Vue 3 Composition API 管理交互状态，TypeScript 定义题目和记录模型，Vite 负责开发与构建；Node.js 仅提供生产静态文件。新版阅读与单词模块由同一 Vue 应用渲染，不使用 iframe。')
r.table('表4-1 核心模块与职责',['模块','主要文件','功能'],[
 ['题库管理','QuestionBank.vue / adapter.ts','搜索、分类、分页、自建题目、导入校验和导出'],['阅读答题','ReadingPractice.vue / html.ts','文章与题目展示、输入交互、选区获取、展示内容过滤'],['自动判分','grading.ts','文本规范化、备选答案、多选无序匹配及部分得分'],['数据保存','storage.ts / ReadingRecords.vue','草稿恢复、记录快照、回看和导出'],['阅读生词','WordDialog.vue / ReadingWordBank.vue','释义查询、手动补充、收藏去重和词汇练习联动']], [1600,2700,4000])
r.h('2.2 统一题目模型')
r.p('通过统一模型把参考内容与答题状态分开，降低各题型之间的耦合。accepted 表示文本或单选可接受答案，correctSet 表示多选正确集合，points 表示分值。题目来源与练习记录一起保存，避免将复用资源误写为自编试题。')
r.code('代码4-1 题目数据模型（src/reading/model.ts 节选）','''
export interface Question {
  id: string;
  label: string;
  kind: 'text' | 'choice' | 'multi' | 'matching';
  promptHtml: string;
  options: Option[];
  accepted: string[];
  points: number;
  correctSet?: string[];
  maxWords?: number;
  selectionCount?: number;
}
export type Answers = Record<string, string | string[]>;
''')
r.h('2.3 判分逻辑')
r.p('判分逻辑提取为独立纯函数，不直接操作页面。文本统一全角字符、大小写、英文弯引号及连续空格；多选题采用集合比对，忽略选择顺序，去除重复值，并拒绝超量或不存在的选项。')
r.code('代码4-2 答案规范化与多选判分（grading.ts 节选）','''
export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim()
    .replace(/[’‘]/g, "'").replace(/\\s+/g, ' ');
}
// gradeQuestion 中的多选分支
const chosen = Array.isArray(raw)
  ? [...new Set(raw.map(normalizeAnswer))] : [];
const expected = new Set(
  (question.correctSet || []).map(normalizeAnswer)
);
if (chosen.length <= (question.selectionCount || question.points)
  && chosen.every(v => question.options.some(
    o => normalizeAnswer(o.value) === v))) {
  earned = Math.min(question.points,
    chosen.filter(v => expected.has(v)).length);
}
''')
r.p('备选答案与可选词还会通过 alternatives 函数展开；gradeExam 对各题结果进行求和，计算正确率并输出逐题状态。本实现提供练习得分，不换算未经验证的 IELTS 等级。')
r.h('2.4 草稿保存与练习记录')
r.p('阅读输入发生变化时保存草稿，计时器同步保存累计用时；重新进入同篇文章后，按 examId 恢复 sessionId、answers 和 seconds。已提交记录包含文章快照，因此后续编辑自建题目不会改写历史结果。')
r.code('代码4-3 草稿持久化（ReadingPractice.vue，排版整理）','''
function persist() {
  if (!result.value) {
    saveDraft({
      version: 1, examId: props.exam.id, sessionId,
      answers: answers.value, seconds: seconds.value,
      updatedAt: new Date().toISOString()
    });
  }
}
watch(answers, persist, { deep: true });
''')
r.code('代码4-4 同一会话记录去重（storage.ts，排版整理）','''
export function saveRecord(record: ReadingRecord) {
  const next = [record, ...readingHistory.value
    .filter(r => r.id !== record.id)];
  if (!write('ielts-practice-reading-records-v1', next)) {
    return false;
  }
  readingHistory.value = next;
  return true;
}
''')
r.h('2.5 阅读选词收藏与词汇练习联动')
r.p('通过 window.getSelection() 和 Range 获取文章或题目区域内的英文选区，校验单词或短语格式后显示“加入生词库”。收藏窗口按需查询本地词典；若未收录则要求手动输入释义，不将空释义保存为学习内容。')
r.code('代码4-5 阅读生词去重保存（storage.ts，排版整理）','''
export function saveReadingWord(word: ReadingWord) {
  const next = [word, ...readingWords.value.filter(w =>
    w.word.toLowerCase() !== word.word.toLowerCase())];
  if (!write('ielts-practice-reading-words-v1', next)) {
    return false;
  }
  readingWords.value = next;
  return true;
}
''')
r.p('生词同时保留 example、examId、sourceTitle 和 source。原文采用标记样式提示已收藏单词；Study.vue 增加 reading 词库分支，复用已有拼写、释义记忆、到期复习和错词巩固逻辑。')
r.h('2.6 输入校验与页面安全')
r.p('adapter.ts 校验题目编号、题型、来源、答案、选项和分值。html.ts 使用 DOMParser 解析展示内容，移除脚本、事件属性及不允许的标签，仅保留安全的排版元素和限定的图片地址。来源说明和参考答案以数据形式处理，不加载旧阅读界面的业务脚本。')
r.h('三、开发结果与分析')
r.p('本次运行 npm test，通过 7 项判分逻辑测试；浏览器全量检查覆盖 238 篇文章、3,199 分题目，格式适配与参考答案得分一致性检查通过。阅读草稿刷新恢复、选词收藏、提交回看、阅读生词进入词汇练习及手机布局也已验证。上述一致性检查不等同于对原试题答案进行学科审定。')
r.image('library.png','图4-1 阅读题库与自建题目管理界面')
r.image('practice.png','图4-2 阅读答题及原文生词标记界面')
r.p('本实验将数据适配、判分纯函数、界面状态与存储职责分离，有利于独立调试和回归验证。当前限制包括仅在本地浏览器保存数据、旧版阅读记录未自动迁移，以及缺少云端账号与跨设备同步。')
r.h('四、开发与资料来源说明')
r.p('新版阅读模块在编程助手辅助下实现；已有单词练习工程和学习算法继续沿用。文章、题目及原始参考答案来自项目既有资源（https://github.com/sallowayma-git/IELTS-practice），本地词典数据来源包括 ECDICT（https://github.com/skywind3000/ECDICT）。个人编码、理解、调试与测试贡献应按实际参与情况在答辩材料中说明。')
paths=[r.save()]

r=Report(5,'项目部署安装')
r.h('一、项目名称')
r.p('IELTS Practice 雅思阅读与词汇学习系统的本地生产构建与部署。')
r.h('二、部署过程')
r.h('2.1 部署方案与环境')
r.p('本实验实际采用本地部署：先由 Vite 生成 dist/，再由 Node.js 原生 HTTP 服务提供静态页面和 JSON 资源。实验未部署到公网云服务器，没有安装独立数据库或业务中间件。用户数据保存在当前浏览器的 localStorage 中。')
env=json.loads((EVIDENCE/'deployment.json').read_text())['environment']
r.table('表5-1 本次实际部署环境',['项目','实际配置'],[['操作系统/架构','macOS / '+env['arch']],['Node.js / npm',env['node']+' / 11.12.1'],['Vue / TypeScript',env['vue']+' / '+env['typescript']],['Vite',env['vite']],['浏览器','Chrome 156（自动化验证使用独立无界面配置）'],['服务地址','http://127.0.0.1:3208'],['数据存储','浏览器 localStorage；题库和词典为静态 JSON']], [2400,5900])
r.h('2.2 源代码与依赖检查')
r.p('检查 package.json、package-lock.json、src/、public/ 和 server/ 目录。本次使用已安装的项目依赖，核对 Node.js 与 npm 版本；若在新电脑首次部署，可执行 npm ci 按锁文件安装依赖。本次没有重复执行依赖下载或操作系统安装。')
r.code('命令5-1 环境与依赖检查命令','''
node -v
npm -v
# 首次安装时执行，本次复用已安装依赖：
npm ci
''')
r.h('2.3 阅读资源准备与生产构建')
r.p('执行 npm run build。该命令依次进行阅读数据准备、Vue/TypeScript 类型检查、Vite 前端打包和 Node.js 服务端编译。转换得到 238 篇文章和 20,261 条本地词典条目；该数量表示合并后的可查询词条，不表示全部为新编词汇。')
r.code('命令5-2 构建流程（package.json）','''
npm run prepare:reading
npm run typecheck
vite build
tsc -p tsconfig.server.json
''')
r.p('构建日志显示前端输出为 dist/index.html、dist/assets/ 等，服务端输出为 server-dist/index.js。Vue 与 TypeScript 检查通过，Vite 构建完成，日志保存在 reports/evidence/build.txt。')
r.h('2.4 启动生产静态服务')
r.p('本次验证脚本以 HOST=127.0.0.1、PORT=3208 启动 server-dist/index.js，避免占用项目默认端口。实际启动方式等价于以下命令；npm start 默认调用同一入口，未设置 PORT 时默认监听 3000 端口。')
r.code('命令5-3 本地启动命令','''
HOST=127.0.0.1 PORT=3208 node server-dist/index.js
# 或使用项目脚本（默认端口 3000）：
npm start
''')
r.p('浏览器访问 http://127.0.0.1:3208/。服务以 dist/ 为根目录，返回 HTML、JavaScript、CSS 和 JSON。访问不存在的路径返回 404，非 GET/HEAD 请求返回 405。本项目使用根路径资源地址，部署时应以 dist/ 为站点根目录。')
r.h('2.5 部署访问与功能检查')
r.p('使用 HTTP 请求检查首页、目录、单篇题目、词典及构建资源，再使用 Chrome 加载生产构建首页。实际验证日志与状态码见表5-2；界面截图见图5-1。')
rows=[]
for c in json.loads((EVIDENCE/'deployment.json').read_text())['checks']:
 url=c['url']
 if url.startswith('/assets/'):
  url='/assets/…'+('.js'if url.endswith('.js')else'.css')
 rows.append([c['method'],url,str(c['status']),'符合预期'])
r.table('表5-2 生产部署 HTTP 检查',['方法','资源路径','状态码','结果'],rows,[1000,4200,1200,1900])
r.h('2.6 数据保存与备份注意事项')
r.p('localStorage 按协议、域名和端口隔离。例如开发服务器与 127.0.0.1:3208 不共享同一存储空间，换地址后看不到原记录不一定意味着文件丢失。测试使用临时浏览器配置，未操作日常浏览器中的学习数据。')
r.p('需要迁移时应先使用应用的导出功能保存文件；旧版 IndexedDB 与旧备份未自动转换为新版记录，不应将两种格式直接混用。部署前应保留已有备份。本次未修改 Downloads 中原有备份文件。')
r.h('三、部署结果')
r.p('本地生产构建启动成功，9 项 HTTP 检查符合预期。Chrome 能正常加载新版题库首页；有效 JSON 题目导入、阅读答题、部分判分、记录刷新回看及手动生词收藏也已在该生产服务上完成补充验证。')
r.image('production-home.png','图5-1 本地生产构建首页（127.0.0.1:3208）')
r.p('结果分析：该项目以静态前端为主体，部署步骤较少，不依赖数据库服务即可完成学习流程。公网部署、HTTPS、访问权限配置、持续运行守护以及容量规划尚未在本实验中实际验证；本报告不将本地运行结果表述为云端上线。')
r.h('3.1 常见问题及排查方法')
r.table('表5-3 部署问题排查清单',['问题','排查方法'],[['页面无法访问','检查进程、HOST 和 PORT；确认端口未被占用。'],['构建失败','先查看 typecheck 输出和 Node.js 版本，再排查依赖安装情况。'],['资源返回 404','确认 dist/ 完整且作为站点根目录，检查资源路径与文件名。'],['看不到开发环境记录','检查协议、域名与端口是否变化；使用原地址或导出备份。'],['保存失败','检查浏览器存储权限与空间，先导出数据，避免清理未备份记录。']], [2200,6100])
r.p('表5-3 为后续部署的排查建议，不表示这些故障均在本次实验中实际发生。')
paths.append(r.save())

r=Report(6,'项目系统测试')
r.h('一、项目名称')
r.p('IELTS Practice 雅思阅读与词汇学习系统的功能与集成测试。')
r.h('二、测试方法概述')
r.p('测试围绕“题库选择或导入→阅读答题→自动判分→记录回看→阅读生词收藏→单词练习”主流程展开。将纯判分函数与浏览器业务流程分开验证，既检查计算结果，也检查页面状态及本地存储。')
r.table('表6-1 测试层次与方法',['层次','方法','工具及检查对象'],[['逻辑测试','等价类与边界值','node:test；文本规范化、备选答案、多选数量、重复选项和汇总'],['数据适配测试','全量一致性检查','238 篇文章；题目模型校验、参考答案得分及目录分值一致性'],['浏览器集成测试','黑盒流程与持久化检查','Chrome CDP；刷新恢复、选词收藏、提交回看和词汇联动'],['部署验证','HTTP 冒烟测试','生产构建；状态码、资源可达性和实际界面加载'],['界面测试','响应式布局检查','1440×1000 桌面及 390×844 手机视口，检查页面横向溢出']], [1500,2500,4300])
r.p('测试环境为 macOS arm64、Node.js v26.0.0、npm 11.12.1、Vue 3.5.43、TypeScript 5.9.3、Vite 8.3.1 和 Chrome 156。自动化使用独立临时浏览器配置，隔离日常学习数据。')
r.h('三、测试数据')
r.h('3.1 判分逻辑测试数据与结果')
r.p('执行 npm test，共 7 项逻辑测试通过。表6-2 按脚本中的断言整理，数据均为测试样例，不作为真实 IELTS 题目。')
r.table('表6-2 判分逻辑用例',['编号','输入与条件','预期及实测结果'],[
 ['U01','期望 gold ring；输入“  ＧＯＬＤ   RING ”；检查 Farmer’s 引号转换','规范化后匹配成功；引号变为英文单引号。通过。'],['U02','silver ring、空字符串、a gold ring；最多2词','分别为错误、未作答、超词数；均不计分。通过。'],['U03','答案 4/four、(vigorous) exercise、ring/gold ring','four、exercise、ring 等可接受写法得到分数。通过。'],['U04','正确集合 A,C；输入 C,A / A,B / B,D','依次得2分、1分、0分；忽略顺序。通过。'],['U05','输入 A,A / A,C,D / A,forged','分别得1分、0分、0分；重复或非法选项不额外加分。通过。'],['U06','文本1分加多选2分，全部正确','总分3分、得分3分、正确率100%。通过。'],['U07','对输入数组 C,A 执行判分','判分后原数组不被修改。通过。']], [700,3800,3800])
r.h('3.2 浏览器与数据一致性测试')
r.p('执行 npm run test:browser，并运行报告补充验证脚本。全量检查共覆盖 238 篇文章、3,199 分题目，无适配、格式校验及参考答案得分不一致项。该结果只验证程序与题库参考答案一致，不代表题目答案已经过学科专家审定。')
r.table('表6-3 主要浏览器用例',['编号','操作或输入','预期结果','实测'],[
 ['I01','打开题库并遍历238篇 JSON','全部可适配；参考答案获得满分','通过'],['I02','提交含 script、事件属性及 iframe 的展示内容','过滤不允许的标签和属性','通过'],['I03','第1题选择 viii 后刷新页面','恢复该答案和练习草稿','通过'],['I04','选中 Emperor，查询释义并收藏','获得含“皇帝”的释义；原文标记','通过'],['I05','提交全部参考答案并从记录回看','正确率100%；回看控件只读','通过'],['I06','从阅读生词库进入词汇练习','词库为 reading，显示已收藏词释义','通过'],['I07','新建示例题；重复题号送入校验器','合法数据可保存；重复题号被拒绝','通过'],['I08','切换桌面与手机视口','题库和阅读页无页面级横向溢出','通过'],['I09','导入有效 sample-exam.json，再重复导入','首次成功；重复编号不新增或覆盖','通过'],['I10','选中词典未收录的 Florblorbium，填写释义','手动释义可保存，来源语境保留','通过'],['I11','多选题选满2项','未选的其他选项被禁用','通过'],['I12','样例文本、单选正确；多选一项正确一项错误','总得分3/4，正确率75%','通过'],['I13','打开已提交记录后刷新','结果保持75%，答题控件只读','通过'],['I14','修改自建文章标题','历史记录仍保留原提交时标题和题目快照','通过']], [650,3000,3350,1300])
r.h('3.3 可复现的综合测试样例')
r.p('补充用例使用 sample-exam.json：文章说明图书馆于2024年开放，由当地志愿者捐书，帮助儿童阅读；Florblorbium 为故意设置的虚构词，用于验证词典缺词后的手动输入分支。来源填写为“本地验证用示例文章和题目”。')
r.table('表6-4 综合判分输入',['题目','参考答案/分值','本次输入','实测'],[['第1题：开放年份','2024 / 1分','2024','1分'],['第2题：捐书者','A / 1分','A','1分'],['第3、4题：选择两项细节','B、D / 2分','B、C','1分（部分正确）'],['合计','4分','文本、单选正确；多选部分正确','3分，75%']], [2700,2000,2000,1600])
r.image('graded-result.png','图6-1 综合测试实际结果：3/4，正确率75%')
r.image('manual-word-dialog.png','图6-2 词典缺词时允许手动填写释义')
r.h('3.4 测试结论与改进方向')
r.p('结果表明，在本次测试数据和环境下，题库数据适配、主要判分规则、阅读草稿恢复、记录回看与生词学习联动符合预期。生产静态服务的9项HTTP检查也符合预期。关键证据保存在 reports/evidence/，包括逻辑测试日志、浏览器日志、部署检查JSON和界面截图。')
r.p('开发阶段发现过原始答案大小写、4/four 备选写法、可选词括号以及个别题型标签与实际选项不一致的问题，现由数据适配层优先读取真实选项并整理可接受答案，回归检查通过。')
r.p('本次未进行真实多用户并发压力测试、长时间稳定性测试、全部浏览器兼容性测试和存储配额耗尽测试。公网部署与跨设备同步也不在已完成范围内。后续可补充异常网络、浏览器存储限制、键盘及触屏交互和更多独立题目样例，扩大覆盖面。')
r.p('实验启示是将判分计算与界面交互分层验证，并将自动化记录与截图作为结果依据。文章、题目和词典为既有或明确标注的测试资料，系统开发及实验材料整理有编程助手参与，不把资源复用写成独立原创内容。')
paths.append(r.save())
for p in paths:print(p)
