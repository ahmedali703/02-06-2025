// types.ts
export interface ChartData {
  [key: string]: any;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'table' | 'card';
  title: string;
  description?: string;
  xAxis?: string;
  yAxis?: string;
  colorBy?: string;
  data: ChartData[];
}

export interface DashboardConfig {
  title: string;
  description: string;
  charts: ChartConfig[];
  stats: StatCard[];
}

export interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

export interface GenerationStep {
  id: string;
  name: string;
  status: 'waiting' | 'in-progress' | 'completed';
  progress: number;
}

export interface Department {
  name: string;
  maleCount: number;
  femaleCount: number;
  maleSalary: number;
  femaleSalary: number;
  averageAge: number;
}
