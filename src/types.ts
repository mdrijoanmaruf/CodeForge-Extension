export interface TestCase {
  id: number
  label: string
  input: string
  expectedOutput: string
  note?: string
}

export interface ProblemPayload {
  sessionId: string
  platform: 'codeforces'
  problemId: string
  contestId: string
  problemIndex: string
  problemName: string
  problemUrl: string
  statementHtml: string
  timeLimit: string
  memoryLimit: string
  rating?: string
  tags: string[]
  testCases: TestCase[]
  scrapeTimestamp: number
}

export interface RecentProblem {
  problemId: string
  problemName: string
  problemUrl: string
  openedAt: number
}
