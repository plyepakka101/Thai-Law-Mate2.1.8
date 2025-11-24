
export type DiffType = 'equal' | 'insert' | 'delete';
export type DiffPart = { type: DiffType; value: string };

// A simplified Diff algorithm (O(ND) or similar logic appropriate for text)
// For simplicity and performance in this context, we will use a word-based diff approach.
export const computeDiff = (text1: string, text2: string): DiffPart[] => {
  // Tokenize by words and spaces/punctuation to keep formatting roughly intact
  const tokenize = (text: string) => text.split(/([^\S\r\n]+|[.,;:?!\u0E00-\u0E7F]+)/).filter(Boolean);
  
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  // This is a very basic LCS (Longest Common Subsequence) implementation for the sake of the demo.
  // For production, a library like 'diff-match-patch' is recommended, but we are avoiding external deps.
  
  const dp: number[][] = Array(tokens1.length + 1).fill(null).map(() => Array(tokens2.length + 1).fill(0));

  for (let i = 1; i <= tokens1.length; i++) {
    for (let j = 1; j <= tokens2.length; j++) {
      if (tokens1[i - 1] === tokens2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = tokens1.length;
  let j = tokens2.length;
  const diff: DiffPart[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokens1[i - 1] === tokens2[j - 1]) {
      diff.unshift({ type: 'equal', value: tokens1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'insert', value: tokens2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'delete', value: tokens1[i - 1] });
      i--;
    }
  }

  return diff;
};
