import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDayTime, formatDayDate, getDayStatusText, getCurrentDayInfo } from '@/lib/daySystem';

interface DailyWorkHeaderProps {
  dailyTicketCount: number;
}

export function DailyWorkHeader({ dailyTicketCount }: DailyWorkHeaderProps) {
  const { t } = useTranslation();
  const dayInfo = getCurrentDayInfo();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-4xl font-bold text-foreground">
          {t('dailyWork.title')}
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          {t('dailyWork.subtitle')}
        </p>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold text-primary">
          {formatDayTime(new Date())}
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDayDate(new Date())}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {getDayStatusText()} • {Math.round(dayInfo.dayProgress)}% {t('dailyWork.ofTheDay')}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          تذاكر اليوم: {dailyTicketCount}
        </div>
      </div>
    </div>
  );
}
