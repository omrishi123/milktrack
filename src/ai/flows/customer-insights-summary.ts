'use server';
/**
 * @fileOverview An AI agent that provides insights into a specific customer's milk consumption and payment history.
 *
 * - customerInsightsSummary - A function that generates customer insights.
 * - CustomerInsightsInput - The input type for the customerInsightsSummary function.
 * - CustomerInsightsOutput - The return type for the customerInsightsSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MilkEntrySchema = z.object({
  id: z.number().describe('Unique ID for the milk entry.'),
  date: z.string().describe('Date of the entry in YYYY-MM-DD format.'),
  timeOfDay: z.enum(['Morning', 'Evening']).describe('Time of day for the entry.'),
  milkQuantity: z.number().describe('Quantity of milk in liters.'),
  price: z.number().describe('Price per liter of milk.'),
  total: z.number().describe('Total cost for this entry (quantity * price).'),
  paid: z.boolean().describe('Whether this entry has been paid for.'),
});

const CustomerInsightsInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  milkEntries: z.array(MilkEntrySchema).describe('A list of all milk entries for this customer.'),
});
export type CustomerInsightsInput = z.infer<typeof CustomerInsightsInputSchema>;

const CustomerInsightsOutputSchema = z.object({
  summary: z.string().describe('An overall natural language summary of the customer\'s consumption habits and payment behavior.'),
  paymentInsights: z.object({
    hasUnpaidEntries: z.boolean().describe('True if there are any outstanding unpaid milk entries.'),
    totalUnpaidAmount: z.number().describe('The total monetary amount for all unpaid milk entries.'),
    oldestUnpaidEntryDate: z.string().nullable().describe('The date of the oldest unpaid milk entry in YYYY-MM-DD format, or null if all entries are paid.'),
  }).describe('Insights related to the customer\'s payment status.'),
  consumptionInsights: z.object({
    averageDailyConsumptionLiters: z.number().describe('The average daily milk consumption in liters for this customer across all recorded entries.'),
    averageMonthlyConsumptionLiters: z.number().describe('The average monthly milk consumption in liters for this customer across all recorded entries.'),
    consumptionTrend: z.enum(['stable', 'increasing', 'decreasing', 'fluctuating', 'not enough data']).describe('Describes the trend of milk consumption over time (e.g., "stable", "increasing", "decreasing", "fluctuating", or "not enough data" if there are insufficient entries to determine a trend).'),
    highestConsumptionMonth: z.string().nullable().describe('The month (YYYY-MM format) with the highest milk consumption, or null if no data.'),
    lowestConsumptionMonth: z.string().nullable().describe('The month (YYYY-MM format) with the lowest milk consumption, or null if no data.'),
  }).describe('Insights related to the customer\'s milk consumption patterns.'),
});
export type CustomerInsightsOutput = z.infer<typeof CustomerInsightsOutputSchema>;

export async function customerInsightsSummary(input: CustomerInsightsInput): Promise<CustomerInsightsOutput> {
  return customerInsightsSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customerInsightsSummaryPrompt',
  input: {schema: CustomerInsightsInputSchema},
  output: {schema: CustomerInsightsOutputSchema},
  prompt: `You are an AI assistant specialized in analyzing customer milk consumption and payment data.\nYour goal is to provide a comprehensive summary and key insights for the customer \'{{{customerName}}}\' based on the provided milk entry data.\n\nAnalyze the following milk entries for customer \'{{{customerName}}} \':\n{{#if milkEntries.length}}\n{{#each milkEntries}}\n- Date: {{this.date}}, Time: {{this.timeOfDay}}, Quantity: {{this.milkQuantity}}L, Price/L: {{this.price}}, Total: {{this.total}}, Paid: {{this.paid}}\n{{/each}}\n{{else}}\nNo milk entries available for this customer.\n{{/if}}\n\nBased on this data, provide:\n1.  An overall natural language summary of their consumption habits and payment behavior.\n2.  Specific insights regarding their payment status, including any overdue payments and the total amount. Identify the date of the oldest unpaid entry.\n3.  Specific insights regarding their milk consumption patterns, including average daily/monthly consumption, and any observable trends over time. Identify the month with the highest and lowest consumption.\n\nIf there is insufficient data (e.g., less than 2-3 entries), indicate \'not enough data\' for trends and return null for highest/lowest consumption months.\nEnsure your output is a JSON object matching the following schema. Dates should be in \'YYYY-MM-DD\' format and months in \'YYYY-MM\' format. Calculate all numbers accurately.`,
});

const customerInsightsSummaryFlow = ai.defineFlow(
  {
    name: 'customerInsightsSummaryFlow',
    inputSchema: CustomerInsightsInputSchema,
    outputSchema: CustomerInsightsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate customer insights summary.');
    }
    return output;
  }
);
