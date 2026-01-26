import { entries_je, entries_be, colorToRecipeJE, colorToRecipeBE, } from '@/utils/color'

export async function colorToSequence(
  targetColor: [number, number, number],
  edition: 'java' | 'bedrock',
) {
  if(edition === 'bedrock'){
    return colorToRecipeBE(
      entries_be,
      targetColor,
    );
  };
  return colorToRecipeJE(
    entries_je,
    targetColor,
  )
}
