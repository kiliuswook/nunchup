// 실제 시간 스케줄러. 테스트에서는 같은 인터페이스의 가짜 시계를 주입한다.
export const realScheduler = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h),
};
