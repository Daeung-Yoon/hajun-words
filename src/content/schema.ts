import { z } from 'zod'

export const SenseSchema = z.object({
  ko: z.string().min(1),
  en: z.string().min(1),
  bridge: z.string(),
  example: z.string().min(1),
  blank: z.string().refine((s) => s.includes('____'), { message: 'blank에 ____ 가 없음' }),
})

export const WordSchema = z.object({
  id: z.string().min(1),
  no: z.number().int().positive(),
  source: z.string(),
  word: z.string().min(1),
  pos: z.string(),
  ipa: z.string(),
  core: z.object({ ko: z.string().min(1), en: z.string().min(1) }),
  senses: z.array(SenseSchema).min(1),
  koGenerated: z.boolean().default(false),
  image: z.string().nullable().default(null),
  etymology: z.string().nullable().default(null),
})

export const NewWordSchema = WordSchema.omit({ no: true })

export const BankSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  words: z.array(WordSchema).min(1),
})

export const BankIndexEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  file: z.string().min(1),
  wordCount: z.number().int().nonnegative(),
})
export const BankIndexSchema = z.object({ banks: z.array(BankIndexEntrySchema) })

export type Sense = z.infer<typeof SenseSchema>
export type Word = z.infer<typeof WordSchema>
export type NewWord = z.infer<typeof NewWordSchema>
export type Bank = z.infer<typeof BankSchema>
export type BankIndexEntry = z.infer<typeof BankIndexEntrySchema>
export type BankIndex = z.infer<typeof BankIndexSchema>
