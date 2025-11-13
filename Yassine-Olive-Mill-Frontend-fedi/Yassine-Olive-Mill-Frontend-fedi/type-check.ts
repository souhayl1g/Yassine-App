// Temporary file to verify types
import { useDailyWork } from './src/hooks/daily-work/useDailyWork';

// This will help verify that the hook returns the correct types
const dailyWork = useDailyWork();

// These should be async functions
const testAsync = async () => {
  const amount = await dailyWork.calculateEditTotalAmount('sale');
  const details = await dailyWork.calculateEditTotalAmountWithDetails('milling');
  const isMinimum = await dailyWork.isMinimumPriceApplied('sale');
  
  console.log(amount, details, isMinimum);
};

testAsync();
