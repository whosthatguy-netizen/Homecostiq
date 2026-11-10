export type PronounSet = 'he' | 'she'

export const STORY_PAGES = 4

export function makeStoryPages(firstName: string, pronouns: PronounSet) {
  const words = pronouns === 'he'
    ? { subject: 'he', object: 'him', possessive: 'his' }
    : { subject: 'she', object: 'her', possessive: 'her' }

  return [
    `On a bright morning, ${firstName} tied on a little yellow apron. Today, ${words.subject} would make something wonderful.`,
    `${firstName} found flour, crisp apples, and a big mixing bowl. ${words.subject} measured, stirred, and smiled.`,
    `A little splash! The dough landed right on ${words.object}'s nose. ${firstName} laughed, and ${words.possessive} helper laughed too.`,
    `Soon, warm apple muffins filled the kitchen with a cozy smell. ${firstName} shared the first one and beamed: "I made this!"`,
  ]
}
