export type PronounSet = 'he' | 'she'

export const STORY_PAGES = 4

export function makeStoryPages(firstName: string, pronouns: PronounSet) {
  const words = pronouns === 'he'
    ? { subject: 'he', possessive: 'his' }
    : { subject: 'she', possessive: 'her' }

  return [
    `On a bright morning, ${firstName} tied on a little yellow apron. Today, ${words.subject} would make something wonderful.`,
    `${firstName} found flour, crisp apples, and a big mixing bowl. ${words.subject} measured, stirred, and smiled.`,
    `A little splash! A bit of dough landed on ${words.possessive} nose. ${firstName} laughed, and ${words.possessive} helper laughed too.`, 
    `Soon, warm apple muffins filled the kitchen with a cozy smell. ${firstName} shared the first one and beamed: "I made this!"`,
  ]
}
