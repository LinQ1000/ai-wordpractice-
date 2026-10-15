import type { OfficialExam } from './officialBank';
// Official resource metadata only; questions and answer keys remain on IELTS.org.
// Links checked on 2026-10-15. PDF page numbers are one-based.
const sourceUrl = 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test';
const documentUrl = 'https://cdn.ielts.org/Sample-tests/ielts-listening-sample-tasks-2023.pdf';
const audioBase = 'https://cdn.ielts.org/Sample-tests/Listening/';

export const officialListening: OfficialExam[] = [
  {
    id: 'official-listening-1', skill: 'listening', title: '官方听力样题 1 · 表格填空',
    source: 'IELTS.org 官方样题', sourceUrl, documentUrl, page: 3, answerPage: 7,
    audioUrl: `${audioBase}ielts-listening-sample-task-1-form-completion.mp3`,
    questionNumbers: [1, 2, 3, 4, 5, 6, 7, 8], minutes: 10,
  },
  {
    id: 'official-listening-2', skill: 'listening', title: '官方听力样题 2 · 单项选择',
    source: 'IELTS.org 官方样题', sourceUrl, documentUrl, page: 8, answerPage: 10,
    audioUrl: `${audioBase}ielts-listening-sample-task-2-multiple-choice.mp3`,
    questionNumbers: [9, 10], minutes: 10,
  },
  {
    id: 'official-listening-3', skill: 'listening', title: '官方听力样题 3 · 简答题',
    source: 'IELTS.org 官方样题', sourceUrl, documentUrl, page: 11, answerPage: 13,
    audioUrl: `${audioBase}ielts-listening-sample-task-3-short-answer-questions.mp3`,
    questionNumbers: [11, 12, 13, 14, 15, 16], minutes: 10,
  },
  {
    id: 'official-listening-5', skill: 'listening', title: '官方听力样题 5 · 课程选项匹配',
    source: 'IELTS.org 官方样题', sourceUrl, documentUrl, page: 18, answerPage: 21,
    audioUrl: `${audioBase}ielts-listening-sample-task-5-matching.mp3`,
    questionNumbers: [21, 22, 23, 24, 25], minutes: 10,
  },
  {
    id: 'official-listening-6', skill: 'listening', title: '官方听力样题 6 · 酒店信息匹配',
    source: 'IELTS.org 官方样题', sourceUrl, documentUrl, page: 22, answerPage: 25,
    audioUrl: `${audioBase}ielts-listening-sample-task-6-matching.mp3`,
    questionNumbers: [1, 2, 3, 4], minutes: 10,
  },
  {
    id: 'official-listening-7', skill: 'listening', title: '官方听力样题 7 · 平面图标注',
    source: 'IELTS.org 官方样题', sourceUrl, documentUrl, page: 26, answerPage: 28,
    audioUrl: `${audioBase}ielts-listening-sample-task-7-plan-map-diagram-labelling.mp3`,
    questionNumbers: [11, 12, 13, 14, 15], minutes: 10,
  },
];
