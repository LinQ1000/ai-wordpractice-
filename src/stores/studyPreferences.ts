import { ref } from 'vue';
import { batchSize } from './learning';

const key = 'ai-vocabulary-daily-goal';
export const preferencesWarning = ref('');
function readGoal() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    if (typeof value === 'number' && Number.isInteger(value) && value >= 5 && value <= 100) return value;
  } catch { preferencesWarning.value = '每日目标暂时无法读取，已使用每组词数。'; }
  return batchSize.value;
}
export const dailyGoal = ref(readGoal());
export function saveDailyGoal(value: number) {
  if (!Number.isInteger(value) || value < 5 || value > 100) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    dailyGoal.value = value;
    preferencesWarning.value = '';
    return true;
  } catch {
    preferencesWarning.value = '每日目标未能保存，请确认浏览器允许保存数据后重试。';
    return false;
  }
}
