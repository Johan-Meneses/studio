// categorize-transaction.ts
'use server';
/**
 * @fileOverview A transaction categorization AI agent.
 *
 * - suggestCategory - A function that suggests a category for a transaction based on its description.
 * - SuggestCategoryInput - The input type for the suggestCategory function.
 * - SuggestCategoryOutput - The return type for the suggestCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCategoryInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  availableCategories: z.array(z.string()).describe('The available categories for the transaction.'),
});
export type SuggestCategoryInput = z.infer<typeof SuggestCategoryInputSchema>;

const SuggestCategoryOutputSchema = z.object({
  suggestedCategory: z.string().describe('The suggested category for the transaction.'),
  confidence: z.number().describe('The confidence level of the suggested category (0-1).'),
});
export type SuggestCategoryOutput = z.infer<typeof SuggestCategoryOutputSchema>;

export async function suggestCategory(input: SuggestCategoryInput): Promise<SuggestCategoryOutput> {
  return suggestCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCategoryPrompt',
  input: {schema: SuggestCategoryInputSchema},
  output: {schema: SuggestCategoryOutputSchema},
  prompt: `You are a personal finance assistant. Given a transaction description and a list of available categories, suggest the most appropriate category for the transaction.

Transaction Description: {{{description}}}
Available Categories: {{#each availableCategories}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Output the suggested category and a confidence level (0-1) indicating how sure you are of the suggestion.

Please use only the provided categories.

Ensure that the outputted JSON is valid and parsable.`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  }
});

const suggestCategoryFlow = ai.defineFlow(
  {
    name: 'suggestCategoryFlow',
    inputSchema: SuggestCategoryInputSchema,
    outputSchema: SuggestCategoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
