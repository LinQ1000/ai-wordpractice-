from pathlib import Path
import json, math, html
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.xmlchemy import OxmlElement
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/ppt';ASSETS=OUT/'assets';EVIDENCE=ROOT/'reports/evidence';OUT.mkdir(exist_ok=True)
prs=Presentation();prs.slide_width=Inches(13.333333);prs.slide_height=Inches(7.5)
BG='F5F5F7';WHITE='FFFFFF';INK='1D1D1F';MUTED='6E6E73';BLUE='0071E3';PALE='EAF3FF';LINE='E4E5EA';GREEN='21864B';NAVY='12223C'
slides=[];warnings=[]
def rgb(c):return RGBColor.from_string(c)
def rect(slide,x,y,w,h,fill=WHITE,line=None,radius=.18):
 s=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,Inches(x),Inches(y),Inches(w),Inches(h));s.fill.solid();s.fill.fore_color.rgb=rgb(fill)
 if line:s.line.color.rgb=rgb(line);s.line.width=Pt(.7)
 else:s.line.fill.background()
 if radius:
  try:s.adjustments[0]=radius/min(w,h)
  except:pass
 slide._preview.append(f'<div style="position:absolute;left:{x*96}px;top:{y*96}px;width:{w*96}px;height:{h*96}px;background:#{fill};border-radius:{radius*96}px;'+(f'border:1px solid #{line};'if line else'')+'"></div>')
 return s
def txt(s,x,y,w,h,text,size=20,color=INK,bold=False,align='left',font='Aptos',valign='top'):
 box=s.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h));tf=box.text_frame;tf.clear();tf.word_wrap=True;tf.margin_left=0;tf.margin_right=0;tf.margin_top=0;tf.margin_bottom=0;tf.vertical_anchor=MSO_ANCHOR.MIDDLE if valign=='middle'else MSO_ANCHOR.TOP
 for i,line in enumerate(text.split('\n')):
  p=tf.paragraphs[0]if i==0 else tf.add_paragraph();p.text=line;p.font.name=font;p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=rgb(color);p.alignment={'left':PP_ALIGN.LEFT,'center':PP_ALIGN.CENTER,'right':PP_ALIGN.RIGHT}[align];p.line_spacing=1.15;p.space_after=Pt(3 if size<30 else 1)
  for run in p.runs:
   rpr=run._r.get_or_add_rPr();ea=OxmlElement('a:ea');ea.set('typeface','PingFang SC');rpr.append(ea);rpr.set('lang','zh-CN')
 # Conservative line-height checks based on available width, including Chinese glyphs.
 lines=0
 for l in text.split('\n'):
  units=sum(.53 if ord(c)<128 else 1 for c in l);lines+=max(1,math.ceil(units*size/(w*72)))
 if lines*size*1.15>h*72+7:warnings.append({'slide':len(slides),'text':text[:50],'estimatedLines':lines,'boxHeight':h})
 if x<0 or y<0 or x+w>13.334 or y+h>7.501:warnings.append({'slide':len(slides),'bounds':(x,y,w,h)})
 esc=html.escape(text).replace('\n','<br>');s._preview.append(f'<div style="position:absolute;left:{x*96}px;top:{y*96}px;width:{w*96}px;height:{h*96}px;font-size:{size*96/72}px;line-height:1.15;font-weight:{600 if bold else 400};color:#{color};text-align:{align};white-space:normal;overflow:hidden;'+('display:flex;align-items:center;'if valign=='middle'else'')+f'">{esc}</div>')
 return box
def line(s,x1,y1,x2,y2,color=LINE,width=1.2,arrow=False):
 sh=s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,Inches(x1),Inches(y1),Inches(x2),Inches(y2));sh.line.color.rgb=rgb(color);sh.line.width=Pt(width)
 if arrow:
  ln=sh._element.spPr.get_or_add_ln();end=OxmlElement('a:tailEnd');end.set('type','triangle');ln.append(end)
 s._preview.append(f'<svg style="position:absolute;inset:0;width:1280px;height:720px;pointer-events:none"><line x1="{x1*96}" y1="{y1*96}" x2="{x2*96}" y2="{y2*96}" stroke="#{color}" stroke-width="{width*1.333}"/></svg>')
def image(s,path,x,y,w,h,frame=True):
 path=Path(path);im=Image.open(path);iw,ih=im.size;scale=min(w/iw,h/ih);pw,ph=iw*scale,ih*scale;left=x+(w-pw)/2;top=y+(h-ph)/2
 if frame:rect(s,left-.04,top-.04,pw+.08,ph+.08,WHITE,LINE,.12)
 s.shapes.add_picture(str(path),Inches(left),Inches(top),width=Inches(pw),height=Inches(ph))
 rel=path.relative_to(OUT)if path.is_relative_to(OUT)else Path('..')/path.relative_to(ROOT/'reports')
 s._preview.append(f'<img src="{html.escape(str(rel))}" style="position:absolute;left:{left*96}px;top:{top*96}px;width:{pw*96}px;height:{ph*96}px;object-fit:contain">')
def note(s,text):s.notes_slide.notes_text_frame.text=text;s._notes=text

def new(title,eyebrow,subtitle='',dark=False):
 s=prs.slides.add_slide(prs.slide_layouts[6]);s._preview=[];s._notes='';s._title=title;slides.append(s);s.background.fill.solid();s.background.fill.fore_color.rgb=rgb(NAVY if dark else BG)
 if eyebrow:txt(s,.65,.34,11.8,.25,eyebrow,11,BLUE if not dark else'9CCAFF',True)
 if title:txt(s,.65,.84,12, .65,title,30,WHITE if dark else INK,True)
 if subtitle:txt(s,.67,1.52,11.9,.5,subtitle,15,'C7D1E0'if dark else MUTED)
 line(s,.65,7.08,12.68,7.08,'2B3E59'if dark else LINE,.7);txt(s,.65,7.18,10,.18,'IELTS Practice  /  毕业设计答辩',9,'ABB8CC'if dark else MUTED);txt(s,12.05,7.17,.6,.2,f'{len(slides):02d}',10,'ABB8CC'if dark else MUTED,align='right')
 return s

def card(s,x,y,w,h,num,title,body):
 rect(s,x,y,w,h,WHITE,LINE);txt(s,x+.22,y+.2,1.6,.35,num,17,BLUE,True);txt(s,x+.22,y+.72,w-.44,.45,title,22,INK,True);txt(s,x+.22,y+1.28,w-.44,h-1.4,body,17,MUTED)
def chip(s,x,y,w,label,fill=PALE,color=BLUE):rect(s,x,y,w,.36,fill,radius=.15);txt(s,x+.08,y+.06,w-.16,.23,label,11,color,True,align='center')
def callout(s,x,y,w,num,title,body):
 txt(s,x,y,.35,.3,num,13,BLUE,True);txt(s,x+.48,y,w-.48,.35,title,19,INK,True);txt(s,x+.48,y+.48,w-.48,.77,body,16,MUTED)

s=new('', '成都锦城学院  ·  计算机与软件学院')
txt(s,.7,1.48,7,.45,'基于 Vue 3 与 TypeScript 的',23,BLUE,True)
txt(s,.7,2.1,7.25,2.25,'雅思阅读与词汇学习系统\n设计与实现',38,INK,True)
txt(s,.73,4.64,6.4,.45,'以阅读为入口，让生词进入持续复习。',19,MUTED)
line(s,.74,5.36,6.85,5.36,LINE)
txt(s,.74,5.64,6.4,.78,'答辩人：林谦    学号：233020696\n班级：2023级前端技术开发方向2班',15,INK)
txt(s,.74,6.52,6.4,.25,'指导教师：待填写    答辩日期：待填写',12,MUTED)
for i,(tag,title,body)in enumerate([('READ','阅读训练','文章 · 题目 · 作答'),('COLLECT','语境收藏','单词 · 释义 · 来源'),('REVIEW','词汇巩固','拼写 · 复习 · 记录')]):
 x=8.38+(.2 if i==1 else 0);y=1.7+i*1.46;rect(s,x,y,3.83,1.15,WHITE,LINE);txt(s,x+.23,y+.14,3.3,.2,tag,10,BLUE,True);txt(s,x+.23,y+.43,3.3,.34,title,21,INK,True);txt(s,x+.23,y+.82,3.3,.2,body,11,MUTED)
note(s,'各位老师好，我的答辩题目是《基于Vue3与TypeScript的雅思阅读与词汇学习系统设计与实现》。系统以阅读训练为入口，把阅读中遇到的单词连同语境与来源一起收藏，再接入词汇复习。下面从需求、设计、实现和验证四个方面介绍。封面指导教师与答辩日期需要在正式使用前补全。')

s=new('选题背景：学习流程分散，生词缺少后续衔接','01  BACKGROUND','设计目标：把阅读、收藏和复习连接成一条可持续使用的流程。')
card(s,.65,2.27,3.9,3.45,'01','工具切换频繁','阅读题库、词典与背单词工具分开使用，学习流程容易中断。')
card(s,4.72,2.27,3.9,3.45,'02','生词容易脱离语境','仅保存单词与释义，往往无法回到最初遇见它的文章。')
card(s,8.79,2.27,3.9,3.45,'03','过程记录不连续','未完成答案、练习结果与复习进度，需要统一管理。')
txt(s,.9,6.16,11.6,.5,'核心问题：如何让“这次阅读中的生词”进入“下一次词汇练习”？',23,BLUE,True,align='center')
note(s,'选择这个题目，是因为雅思阅读和词汇学习联系密切，但实际操作常常分散。系统并不预先声称能提高多少分，而是先解决流程衔接的问题：选文章、完成答题、核对结果，再将遇到的词带入后续练习。这里的价值主要体现在学习过程的连续性和记录的可追溯性。')

s=new('需求分析：围绕两条核心业务线组织功能','02  REQUIREMENTS','阅读训练负责理解与反馈，词汇学习负责语境积累与巩固。')
for x,title,items in[(.65,'阅读训练',['题库检索、Part 筛选与分页','文本、判断、选择和匹配答题','自动判分、草稿恢复与记录回看']),(6.76,'词汇学习',['阅读选词、本地查词与手动补充','保存上下文和来源，原文标记','拼写、释义、到期复习和错词巩固'])]:
 rect(s,x,2.25,5.92,3.23,WHITE,LINE);txt(s,x+.3,2.55,5.3,.45,title,25,INK,True)
 for i,t in enumerate(items):chip(s,x+.3,3.25+i*.59,.3,str(i+1));txt(s,x+.76,3.23+i*.59,4.8,.42,t,17,INK)
rect(s,.65,5.79,12.03,.71,PALE);txt(s,.93,6.0,11.5,.3,'管理支撑：自建题目导入 / 编辑 / 导出，数据校验，响应式页面。',18,BLUE,True)
note(s,'需求分为阅读训练与词汇学习两条主线。阅读侧要解决题目选择、作答、反馈和进度保存；词汇侧要将阅读中遇到的内容沉淀下来。题库的创建、导入与编辑属于管理支撑功能。当前面向浏览器本地使用，没有设计账号系统和跨设备同步。')

s=new('总体架构：页面、业务逻辑与数据分层','03  ARCHITECTURE','新版阅读由 Vue 组件直接渲染，题库与词典按需读取 JSON。')
rows=[('展示层','Vue 3 组件',['阅读与答题','词汇练习','题库与记录管理']),('业务层','TypeScript 模块',['题目适配与校验','判分与状态管理','选词与词汇联动']),('数据层','本地与静态数据',['文章 / 词典 JSON','草稿 / 题目快照','localStorage'])]
for i,(label,desc,items)in enumerate(rows):
 y=2.12+i*1.42;rect(s,.65,y,12.03,1.18,WHITE,LINE);txt(s,.91,y+.22,1.38,.38,label,22,BLUE,True);txt(s,.91,y+.71,1.8,.24,desc,11,MUTED)
 for j,item in enumerate(items):rect(s,3.12+j*3.0,y+.27,2.72,.64,PALE);txt(s,3.2+j*3.0,y+.43,2.56,.32,item,16,INK,True,align='center')
txt(s,.86,6.62,11.8,.22,'工程支撑：Vite 构建与类型检查  →  dist/  →  Node.js 静态服务',13,MUTED)
note(s,'架构上把页面、业务逻辑和数据分开。Vue负责展示和交互，TypeScript模块负责适配、校验、判分与持久化。文章和词典不是从旧页面提取界面，而是转换成纯JSON数据。生产部署时，Vite生成静态构建产物，由Node.js提供访问；当前没有独立的数据库服务器。')

s=new('数据设计：统一模型，保留语境与历史快照','04  DATA MODEL','题目、草稿、结果和阅读生词通过稳定编号关联。')
entities=[(.65,2.1,'ReadingExam','文章编号 · 标题 · 来源\n正文 · 题组'),(4.77,2.1,'QuestionGroup','题组编号 · 题型\n说明 · 题目列表'),(8.89,2.1,'Question','题号 · 选项 · 答案\n分值 · 选择数量'),(.65,4.57,'ReadingDraft','examId · sessionId\n答案 · 累计用时'),(4.77,4.57,'ReadingRecord','得分 · 日期 · 答案\n提交时的题目快照'),(8.89,4.57,'ReadingWord','单词 · 释义 · 上下文\n来源文章 · 收藏时间')]
for x,y,title,body in entities:rect(s,x,y,3.79,1.62,WHITE,LINE);txt(s,x+.23,y+.21,3.32,.38,title,23,BLUE,True);txt(s,x+.23,y+.78,3.32,.65,body,16,MUTED)
for x in[4.44,8.56]:line(s,x,2.92,x+.3,2.92,BLUE,1.5,True)
line(s,2.55,3.74,2.55,4.42,BLUE,1.5,True);txt(s,2.78,3.94,3.3,.35,'以文章编号保存草稿',12,MUTED)
txt(s,.86,6.56,11.7,.26,'关键选择：记录保存题目快照，自建题目后续修改不会重写已提交结果。',15,BLUE,True)
note(s,'数据设计的重点是统一题目模型，并用文章编号和会话编号连接作答过程。一个文章包含多个题组，题组内有多个题目。草稿保存当前状态，记录保存提交时的题目快照；收藏词保存原句和文章来源。这样可以解释为什么题库内容修改后，历史记录仍能保持原样。')

s=new('题库管理：把内容资源变成可管理的题目','05  IMPLEMENTATION','自建题目使用统一 JSON 格式，导入前进行结构与答案校验。')
callout(s,.73,2.3,3.45,'01','快速找到文章','关键词搜索、Part 分类和分页。')
callout(s,.73,3.8,3.45,'02','自建与复制编辑','保留内置资源，支持新建、编辑与导出。')
callout(s,.73,5.3,3.45,'03','导入时先校验','检查重复编号、来源、选项与分值。')
image(s,ASSETS/'library-detail.png',4.5,2.37,8.12,3.83)
txt(s,4.6,6.5,7.9,.28,'实际界面截图：题库检索与管理',12,MUTED)
note(s,'题库管理从使用和维护两个角度设计。学习者可以搜索、分类和分页；维护者可以新建题目，或者复制内置题目后编辑。导入前检查编号、题型、来源、答案与分值，不完整的数据不会直接进入题库。这里展示的是实际页面，内容数据沿用已有资源并保留来源。')

s=new('阅读交互：作答过程可恢复，内容与控件分离','06  IMPLEMENTATION','桌面采用分栏布局；移动端改为纵向阅读与答题。')
callout(s,.73,2.15,3.2,'01','文章与题目分栏','左侧阅读，右侧使用新的答题控件。')
callout(s,.73,3.65,3.2,'02','答案自动保存','输入变化时保存草稿，刷新后恢复。')
callout(s,.73,5.15,3.2,'03','过程清楚可见','展示已答数量、用时和提交确认。')
image(s,ASSETS/'practice-detail.png',4.36,1.99,8.28,4.91)
note(s,'阅读页面将内容展示与答题控件分离，避免直接依赖旧页面的表单逻辑。桌面使用左右分栏，手机使用纵向布局。答案变化时保存草稿，按文章编号恢复。提交之前会提示未作答数量，提交之后展示结果。界面同时支持选词收藏，已收藏词会在原文中标记。')

s=new('自动判分：规则独立，结果可解释','07  GRADING','以统一题目模型计算分值，给出逐题反馈和参考答案。')
for i,label in enumerate(['答案规范化','检查可接受答案','多选集合比对','汇总分值与状态']):
 x=.65+i*3.08;rect(s,x,2.18,2.8,.77,WHITE,LINE);txt(s,x+.1,2.41,2.6,.28,label,17,INK,True,align='center')
 if i<3:line(s,x+2.82,2.57,x+3.02,2.57,BLUE,1.5,True)
rect(s,.65,3.38,5.65,2.8,WHITE,LINE);txt(s,.95,3.65,5.1,.35,'关键规则',21,INK,True)
for i,(a,b)in enumerate([('文本','统一大小写、全角字符与空格'),('备选','支持替代写法与可选词'),('多选','忽略顺序、去重、允许部分得分')]):
 txt(s,.97,4.2+i*.55,.75,.3,a,15,BLUE,True);txt(s,1.81,4.2+i*.55,4.05,.4,b,15,INK)
image(s,ASSETS/'score-detail.png',6.7,3.4,5.93,1.94)
txt(s,6.94,5.65,5.4,.4,'示例：1 + 1 + 1 = 3 / 4  →  75%',20,BLUE,True)
txt(s,.82,6.65,11.8,.23,'边界：按参考答案核对，不提供语义近似评分，也不换算 IELTS 等级。',12,MUTED)
note(s,'判分逻辑写成独立函数，先规范化输入，再检查可接受答案。多选使用集合比对，选择顺序不影响结果；重复选项不会额外得分，超量或非法选项也有约束。右侧是实际测试样例：文本和单选各一分，多选获得部分分，总计三分，正确率百分之七十五。系统不把单篇结果换算为IELTS等级。')

s=new('阅读生词收藏：把“单词”与“遇见它的语境”一起保存','08  KEY FEATURE','选词 → 查词 → 调整释义 → 收藏 → 原文标记。')
image(s,ASSETS/'word-dialog.png',.8,2.08,5.0,4.58)
for i,(title,body)in enumerate([('获取有效选区','只处理阅读区域内的英文单词或短语'),('优先查询本地词典','未收录时允许手动补充语境含义'),('保存上下文与来源','单词、释义、原句和文章编号一起保存'),('收藏后立即标记','在原文提示已收藏单词，方便回看')]):
 y=2.15+i*1.13;txt(s,6.27,y,.4,.3,f'0{i+1}',13,BLUE,True);txt(s,6.86,y,5.48,.35,title,20,INK,True);txt(s,6.86,y+.45,5.48,.4,body,16,MUTED)
txt(s,.88,6.74,11.8,.18,'截图采用虚构测试词，演示词典未收录时的手动输入分支。',10,MUTED)
note(s,'这是本项目比较突出的交互功能。学习者选中阅读中的词后，可以查询本地词典，按文章语境修改含义，再加入阅读生词库。保存时保留原句和来源，而不仅是一个孤立单词。截图使用虚构测试词，目的是证明词典没收录时仍能手动补充，不能把这个词当作真实词汇讲解。')

s=new('词汇学习联动：收藏之后，可以继续练习','09  VOCABULARY LOOP','阅读生词库接入已有单词练习与复习调度。')
image(s,ASSETS/'study-detail.png',.72,2.06,7.82,4.83)
for i,(a,b)in enumerate([('阅读生词库','保留含义、语境与来源'),('拼写 / 释义记忆','从阅读理解转为主动回忆'),('到期复习 / 错词巩固','根据练习表现安排下一次复习')]):
 y=2.42+i*1.4;chip(s,9.05,y,.4,str(i+1));txt(s,9.66,y-.01,2.85,.6,a,20,INK,True);txt(s,9.06,y+.6,3.35,.65,b,16,MUTED)
note(s,'收藏不是终点。阅读生词可以直接作为词库进入拼写或释义练习，复用原有的到期复习和错词巩固功能。这里需要说明开发边界：词汇练习基础此前已存在，本次主要增加阅读生词的接入和整体流程整合，没有把全部原有词汇逻辑重新声明为新开发。')

s=new('练习记录：保存的不只是分数，还有当时的题目','10  PERSISTENCE','使用会话编号去重，保留答案、用时、来源和题目快照。')
image(s,ASSETS/'records-detail.png',.73,2.34,8.15,3.65)
callout(s,9.25,2.24,3.2,'01','结果可回看','已提交答案以只读方式展示。')
callout(s,9.25,3.74,3.2,'02','快照保留历史','自建题目修改后，旧记录保持原样。')
callout(s,9.25,5.24,3.2,'03','同会话不重复','再次保存时按 sessionId 更新。')
txt(s,.86,6.42,7.7,.3,'实际界面截图：示例练习记录与回看入口',12,MUTED)
note(s,'练习记录包含分数，也包含答案、用时、文章来源和提交时的题目快照。快照让历史结果不受题库后续修改的影响。会话编号用于去重，避免保存重试产生重复记录。记录回看时答案控件只读，便于区分历史结果和新练习。数据目前保存在当前浏览器。')

s=new('可靠性处理：在数据进入、展示和保存时分别约束','11  ENGINEERING','将可预见的错误转换成明确提示，保留用户对学习数据的控制。')
card(s,.65,2.25,3.9,3.65,'INPUT','导入校验','检查题号唯一性、来源、题型、选项和分值；拒绝不完整题目。')
card(s,4.72,2.25,3.9,3.65,'DISPLAY','展示内容过滤','过滤脚本、事件属性与不允许的标签；按白名单保留排版内容。')
card(s,8.79,2.25,3.9,3.65,'STORAGE','保存失败提示','保存成功后再反馈；存储不可用时提示用户导出或重试。')
txt(s,.86,6.38,11.6,.34,'工程思路：UI 组件、数据校验、判分函数和持久化分别承担清晰职责。',18,BLUE,True)
note(s,'可靠性处理分为三个环节：导入时检查结构和答案，展示时过滤HTML，保存时检查是否成功。这样可以减少错误数据进入系统，也避免把失败保存显示成成功。这里属于前端基础防护和异常处理，不能等同于完整的服务端安全体系。')

s=new('系统验证：以日志和可复现用例说明完成情况','12  VALIDATION','验证依据为项目已保存的本地测试记录。')
for i,(value,label)in enumerate([('238','篇文章适配检查'),('3,199','分题目一致性检查'),('7','项判分逻辑测试'),('9','项 HTTP 部署检查')]):
 x=.65+i*3.08;rect(s,x,2.15,2.8,1.55,WHITE,LINE);txt(s,x+.12,2.38,2.56,.67,value,38,BLUE,True,align='center');txt(s,x+.12,3.13,2.56,.3,label,14,MUTED,align='center')
for x,title,body in[(.65,'规则测试','规范化、备选答案、边界值\n多选顺序、重复值与部分得分'),(4.72,'流程验证','刷新恢复、收藏与原文标记\n提交回看、词汇联动与题库创建'),(8.79,'补充验证','文件导入、词典缺词与手动输入\n记录刷新、快照不随题目修改')]:
 rect(s,x,4.08,3.9,1.92,WHITE,LINE);txt(s,x+.22,4.35,3.46,.4,title,22,INK,True);txt(s,x+.22,4.98,3.46,.72,body,15,MUTED)
txt(s,.83,6.47,11.8,.4,'证据日期：2026-11-02。全量检查验证程序与参考答案一致，不代替对原始试题的学科审定。',12,MUTED)
note(s,'验证分为逻辑测试、全量数据适配和浏览器流程。已保存的记录显示，238篇文章共3199分题目通过一致性检查，7项判分逻辑测试通过，9项HTTP部署检查符合预期。还验证了刷新恢复、文件导入、词典缺词处理和题目快照。注意，这些数字代表验证覆盖情况，不是用户规模，也不是学习效果提升指标。')

s=new('部署与适配：完成本地生产构建，覆盖桌面与手机布局','13  DELIVERY','当前交付形态：静态前端资源 + Node.js 静态文件服务。')
for i,(title,body)in enumerate([('构建','npm run build\n数据准备 → 类型检查 → 打包'),('启动','npm start\nNode.js 提供 dist/ 资源'),('访问','浏览器打开服务地址\n题库与词典按需加载')]):
 y=2.25+i*1.36;rect(s,.73,y,7.6,1.1,WHITE,LINE);txt(s,.97,y+.2,1.1,.38,title,22,BLUE,True);txt(s,2.28,y+.2,5.74,.67,body,16,INK)
image(s,EVIDENCE/'mobile-library.png',9.02,2.18,1.54,3.96);image(s,EVIDENCE/'mobile-practice.png',10.9,2.18,1.54,3.96)
txt(s,8.98,6.38,3.5,.3,'实际手机视口：390 × 844',12,MUTED,align='center')
txt(s,.94,6.58,7.2,.21,'已验证本地生产运行；尚未验证公网部署、并发负载与长期稳定性。',11,MUTED)
note(s,'生产构建先准备数据并通过类型检查，再生成静态资源。Node.js只提供静态访问，没有业务数据库服务。手机布局使用响应式CSS，测试视口为390乘844。当前验证范围是本地生产运行，没有把它描述成已经云端上线，也没有给出未经测试的并发指标。')

s=new('实现范围与资源来源：说明新增功能，也说明复用基础','14  SCOPE & SOURCES','系统设计与功能实现、文章与题目内容，是不同层面的工作。')
rect(s,.65,2.18,5.92,3.5,WHITE,LINE);txt(s,.94,2.46,5.3,.4,'本次重新实现 / 整合',23,BLUE,True)
txt(s,.94,3.12,5.2,2.1,'阅读界面、题库管理与数据适配\n答题交互、判分与练习记录\n阅读选词收藏及词汇学习联动\n统一界面、类型检查与流程验证',18,INK)
rect(s,6.76,2.18,5.92,3.5,WHITE,LINE);txt(s,7.05,2.46,5.3,.4,'沿用内容 / 工程基础',23,INK,True)
txt(s,7.05,3.12,5.2,2.1,'既有阅读文章、题目和参考答案\nIELTS 核心词汇与 ECDICT 数据\n原有单词练习与复习基础\n已有 Vue / Vite 工程及静态服务',18,MUTED)
txt(s,.86,6.0,11.6,.4,'实现说明：代码生成与修改有编程工具辅助；个人贡献按实际参与的需求、调试与验收说明。',13,MUTED)
box=txt(s,.86,6.53,11.65,.25,'资源：github.com/sallowayma-git/IELTS-practice    ·    github.com/skywind3000/ECDICT',12,BLUE)
box.text_frame.paragraphs[0].runs[0].hyperlink.address='https://github.com/sallowayma-git/IELTS-practice'
note(s,'这一页明确工作边界。本次重新实现阅读模块业务代码，并打通生词收藏到词汇学习的流程；文章、题目、参考答案与词典数据沿用既有资源，原有单词练习基础也继续使用。代码生成和修改使用了编程工具辅助。答辩时应根据自己的实际代码阅读、调试和验收经历补充个人参与内容，避免把资源复用或工具辅助写成完全独立原创。')

s=new('不足与后续计划：从本地可用，走向更完整的数据服务','15  LIMITATIONS','下一阶段优先完善数据可迁移性，再扩大使用与验证范围。')
for i,(a,b,c)in enumerate([('本地存储边界','数据依赖当前浏览器与访问地址','优先：旧版数据迁移与备份恢复'),('尚无跨设备同步','当前没有账号与云端数据库','后续：账号、数据服务与同步策略'),('测试覆盖有限','尚缺长期、压力与多浏览器验证','后续：异常场景和兼容性测试'),('内容质量待核实','参考答案一致不代表试题已审定','持续：补充原始出版物与来源核验')]):
 x=.65+(i%2)*6.11;y=2.18+(i//2)*2.15;rect(s,x,y,5.92,1.87,WHITE,LINE);txt(s,x+.24,y+.22,5.44,.38,a,22,INK,True);txt(s,x+.24,y+.83,5.44,.35,b,16,MUTED);txt(s,x+.24,y+1.33,5.44,.33,c,15,BLUE,True)
note(s,'系统仍有明确边界。第一，数据依赖当前浏览器；第二，还没有账号与跨设备同步；第三，测试没有覆盖长期压力和全部浏览器；第四，原始内容还需要进一步核实出处。因此后续先做旧数据迁移和备份恢复，再考虑云端服务与更完整的质量验证。')

s=new('', '16  SUMMARY & Q&A',dark=True)
txt(s,.79,1.55,11.8,1.22,'让每一次阅读遇见的生词，\n成为下一次练习的起点。',36,WHITE,True)
txt(s,.84,3.26,10.9,.54,'已打通：阅读答题  →  选词收藏  →  词汇复习  →  记录回看',22,'9CCAFF',True)
line(s,.85,4.35,12.45,4.35,'2B3E59',1)
txt(s,.86,4.83,10.9,.6,'感谢各位老师，恳请批评指正。',30,WHITE,True)
txt(s,.88,5.83,10.6,.35,'演示建议：打开文章 → 收藏一个单词 → 回看结果并进入词汇练习',16,'C7D1E0')
note(s,'总结来说，项目把阅读、语境生词、词汇复习与练习记录连接起来，并通过独立判分函数和浏览器流程验证保证主要功能可检查。如果现场允许演示，可以依次打开文章，收藏一个单词，再展示记录回看和阅读生词练习。我的介绍结束，感谢各位老师，恳请批评指正。')

s=new('答辩备问：为什么这样设计？','APPENDIX  /  备用页','可在问答环节使用，不必逐条朗读。')
qa=[('为什么使用 Vue 3 与 TypeScript？','组件组织交互界面，响应式状态管理作答过程；类型模型约束题目、答案和记录。'),('为什么先选择 localStorage？','适合本地学习原型，部署简单；容量与同步能力有限，后续可迁移至 IndexedDB 或服务端。'),('如何说明自动判分可靠？','用纯函数测试、全量参考答案一致性和浏览器流程验证；不扩展为未经验证的语义评分。'),('内容和实现是否全部原创？','文章、题目和词典复用既有资源；阅读业务代码重新实现，编程工具辅助情况据实说明。')]
for i,(q,a)in enumerate(qa):
 y=2.12+i*1.13;txt(s,.8,y,11.8,.36,q,20,BLUE,True);txt(s,.82,y+.46,11.7,.48,a,16,INK)
note(s,'备用回答应以自己能解释的实际代码为基础。若被问到判分，可展示grading.ts中的规范化、备选答案和多选集合逻辑；若被问到持久化，可解释草稿、会话编号和题目快照；若被问到原创性，应清楚说明资源复用与编程工具辅助，不能仅凭更换界面就声称所有内容独立原创。')

prs.core_properties.title='基于Vue3与TypeScript的雅思阅读与词汇学习系统设计与实现'
prs.core_properties.subject='毕业设计答辩';prs.core_properties.author='林谦';prs.core_properties.keywords='Vue 3, TypeScript, 雅思阅读, 词汇学习, 毕业设计'
output=OUT/'基于Vue3与TypeScript的雅思阅读与词汇学习系统设计与实现-林谦.pptx';prs.save(output)
notes=['# 毕业设计答辩逐页讲稿','题目：基于Vue3与TypeScript的雅思阅读与词汇学习系统设计与实现','答辩人：林谦；学号：233020696；2023级前端技术开发方向2班。','指导教师、答辩日期待填写。第18页为备用问答，可按现场时长选用。','讲稿应结合本人实际代码理解、调试和参与经历调整。']
for i,s in enumerate(slides,1):notes+=['',f'## 第{i}页：{s._title or ("封面"if i==1 else"总结与问答")}',s._notes]
(OUT/'答辩逐页讲稿-林谦.md').write_text('\n\n'.join(notes),encoding='utf8')
(OUT/'layout-check.json').write_text(json.dumps({'slides':len(slides),'warnings':warnings},ensure_ascii=False,indent=2))
sections=[]
for i,s in enumerate(slides):sections.append(f'<section class="slide" id="slide-{i+1}" style="background:#{NAVY if i==16 else BG}">'+''.join(s._preview)+'</section>')
(OUT/'preview.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>答辩PPT预览</title><style>*{box-sizing:border-box}body{margin:0;background:#dfe2e8;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",Arial,sans-serif}.slide{position:relative;width:1280px;height:720px;overflow:hidden;margin:24px auto;box-shadow:0 4px 20px #0002;break-after:page}@page{size:13.333333in 7.5in;margin:0}@media print{body{background:white}.slide{margin:0;box-shadow:none}}</style>'''+''.join(sections)+'</html>',encoding='utf8')
print(json.dumps({'file':str(output),'slides':len(slides),'layoutWarnings':warnings},ensure_ascii=False,indent=2))
