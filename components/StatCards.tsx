'use client';

import React from 'react';
import { StatCard } from './types';
import { Users, DollarSign, Percent, LayoutGrid } from 'lucide-react';

interface StatCardsProps {
  stats: StatCard[];
}

const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  // تعيين الأيقونات المناسبة لكل نوع من البطاقات
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'users':
        return <Users className="w-8 h-8 text-accent" />;
      case 'dollar':
        return <DollarSign className="w-8 h-8 text-primary" />;
      case 'percent':
        return <Percent className="w-8 h-8 text-secondary-foreground" />;
      case 'grid':
        return <LayoutGrid className="w-8 h-8 text-destructive" />;
      default:
        return <Users className="w-8 h-8 text-accent" />;
    }
  };

  // تعيين لون النص بناءً على لون البطاقة
  const getTextColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'text-accent';
      case 'blue':
        return 'text-primary';
      case 'purple':
        return 'text-secondary-foreground';
      case 'pink':
        return 'text-destructive';
      default:
        return 'text-accent';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="feature-card flex items-center hover-glow">
          <div className="mr-4">
            {getIcon(stat.icon)}
          </div>
          <div>
            <h3 className="text-sm text-muted-foreground font-medium">{stat.title}</h3>
            <p className={`text-3xl font-bold ${getTextColor(stat.color)}`}>
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
