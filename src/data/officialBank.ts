import { officialListening } from './officialListening';
export interface OfficialExam {
  id: string;
  skill: 'listening' | 'writing' | 'speaking';
  title: string;
  source: string;
  sourceUrl: string;
  documentUrl: string;
  page: number;
  minutes: number;
  task?: 1 | 2;
  part?: 1 | 2 | 3;
  answerPage?: number;
  audioUrl?: string;
  questionNumbers?: number[];
  starter?: string;
}
const sourceUrl = 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test';
const writingDocument = 'https://ielts.org/cdn/Sample-tests/ielts-academic-writing-sample-tasks-2023.pdf';
const speakingDocument = 'https://ielts.org/cdn/ielts-downloadable-assets/ielts-sample-tests/ielts-speaking-sample-tasks-2023.pdf';
export const officialBank: OfficialExam[] = [
  ...officialListening,
  ...[
    { suffix:'1a',title:'Task 1A · 英国继续教育图表',task:1 as const,page:3,answerPage:9 },
    { suffix:'1b',title:'Task 1B · 广播与电视受众图表',task:1 as const,page:4,answerPage:11 },
    { suffix:'1c',title:'Task 1C · 砖块生产流程图',task:1 as const,page:5,answerPage:13 },
    { suffix:'2a',title:'Task 2A · 家庭经济与成长',task:2 as const,page:6,answerPage:18 },
    { suffix:'2b',title:'Task 2B · 国际旅游的影响',task:2 as const,page:7,answerPage:23 },
  ].map(task=>({id:`official-writing-${task.suffix}`,skill:'writing' as const,title:task.title,source:'IELTS.org 官方样题',sourceUrl,documentUrl:writingDocument,page:task.page,answerPage:task.answerPage,task:task.task,minutes:task.task===1 ? 20 : 40})),
  { id:'official-speaking-1',skill:'speaking',title:'Part 1 · 家乡与居住环境',source:'IELTS.org 官方样题',sourceUrl,documentUrl:speakingDocument,page:3,minutes:5,part:1,starter:'What kind of place is it?' },
  { id:'official-speaking-2',skill:'speaking',title:'Part 2 · 重要的个人物品',source:'IELTS.org 官方样题',sourceUrl,documentUrl:speakingDocument,page:5,minutes:3,part:2,starter:'Describe something you own which is very important to you.' },
  { id:'official-speaking-3',skill:'speaking',title:'Part 3 · 价值观与广告',source:'IELTS.org 官方样题',sourceUrl,documentUrl:speakingDocument,page:6,minutes:5,part:3,starter:'Have things changed since your parents’ time?' },
];
export function documentPage(exam: OfficialExam, answer = false) {
  return `${exam.documentUrl}#page=${answer && exam.answerPage ? exam.answerPage : exam.page}&view=FitH`;
}
