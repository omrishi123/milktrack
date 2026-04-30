"use client";

import React, { useState, useEffect } from 'react';
import { MilkEntry } from '@/lib/types';
import { customerInsightsSummary, CustomerInsightsOutput } from '@/ai/flows/customer-insights-summary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertCircle, TrendingUp, Wallet2, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AiInsightsProps {
  customerName: string;
  entries: MilkEntry[];
}

export default function AiInsights({ customerName, entries }: AiInsightsProps) {
  const [insights, setInsights] = useState<CustomerInsightsOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInsights = async () => {
    if (entries.length === 0) {
      setError("Add some milk entries first to get insights.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await customerInsightsSummary({
        customerName,
        milkEntries: entries.map(e => ({
          id: e.id,
          date: e.date,
          timeOfDay: e.timeOfDay,
          milkQuantity: e.milkQuantity,
          price: e.price,
          total: e.total,
          paid: e.paid,
        })),
      });
      setInsights(result);
    } catch (err) {
      setError("Failed to generate insights. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Intelligent Customer Analysis
              </CardTitle>
              <CardDescription>
                Get AI-powered consumption trends and payment alerts.
              </CardDescription>
            </div>
            <Button 
              onClick={getInsights} 
              disabled={loading}
              size="sm"
              className="bg-primary text-primary-foreground"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {insights ? 'Refresh Insights' : 'Generate Insights'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!insights && !loading && !error && (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">Click the button to analyze delivery patterns for {customerName}.</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse text-sm">Our AI is crunching the numbers...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {insights && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-background border rounded-lg shadow-sm">
                <p className="text-sm leading-relaxed">{insights.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-background shadow-none border-border/50">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Wallet2 className="h-4 w-4 text-emerald-500" />
                      Payment Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overdue Status</span>
                      {insights.paymentInsights.hasUnpaidEntries ? (
                        <Badge variant="destructive">Needs Attention</Badge>
                      ) : (
                        <Badge variant="default" className="bg-emerald-500">Perfect</Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Unpaid</span>
                      <span className="font-bold">₹{insights.paymentInsights.totalUnpaidAmount.toFixed(2)}</span>
                    </div>
                    {insights.paymentInsights.oldestUnpaidEntryDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Oldest Due Date</span>
                        <span className="text-xs font-medium">{insights.paymentInsights.oldestUnpaidEntryDate}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-background shadow-none border-border/50">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      Consumption Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Monthly Avg</span>
                      <span className="font-semibold">{insights.consumptionInsights.averageMonthlyConsumptionLiters.toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Daily Avg</span>
                      <span className="font-semibold">{insights.consumptionInsights.averageDailyConsumptionLiters.toFixed(2)} L</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Trend</span>
                      <Badge variant="outline" className="capitalize">{insights.consumptionInsights.consumptionTrend}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {(insights.consumptionInsights.highestConsumptionMonth || insights.consumptionInsights.lowestConsumptionMonth) && (
                <div className="flex flex-col md:flex-row gap-4">
                  {insights.consumptionInsights.highestConsumptionMonth && (
                    <div className="flex-1 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-blue-500">Peak Usage Month</p>
                        <p className="text-sm font-semibold">{insights.consumptionInsights.highestConsumptionMonth}</p>
                      </div>
                    </div>
                  )}
                  {insights.consumptionInsights.lowestConsumptionMonth && (
                    <div className="flex-1 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-amber-500">Lowest Usage Month</p>
                        <p className="text-sm font-semibold">{insights.consumptionInsights.lowestConsumptionMonth}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}