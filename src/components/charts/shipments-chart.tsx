'use client';

import { useMemo } from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Leaf,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Truck,
  Users,
} from 'lucide-react';

// أنواع البيانات
interface DailyStat {
  date: string;
  pieces: number;
  fees: number;
  shipments: number;
}

interface KhatTypeStat {
  name: string;
  pieces: number;
  fees: number;
  percentage: number;
}

interface AgentPerformance {
  id: string;
  name: string;
  pieces: number;
  fees: number;
  shipments: number;
}

interface ShipmentsChartProps {
  data: DailyStat[];
  khatTypes?: KhatTypeStat[];
  agents?: AgentPerformance[];
  title?: string;
  description?: string;
  showKhatTypes?: boolean;
  showAgents?: boolean;
}

// ألوان الرسوم البيانية
const COLORS = {
  pieces: '#10b981', // emerald
  shipments: '#3b82f6', // blue
  fees: '#8b5cf6', // purple
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#f97316'];

// إعدادات الرسم البياني
const chartConfig = {
  pieces: {
    label: 'الحبات',
    color: COLORS.pieces,
  },
  shipments: {
    label: 'الشحنات',
    color: COLORS.shipments,
  },
  fees: {
    label: 'الأجرة',
    color: COLORS.fees,
  },
} satisfies ChartConfig;

// تنسيق الأرقام
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ar-YE').format(value);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ar-YE', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
};

const formatFullDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

// مكون البطاقة الإحصائية
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'emerald'
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'emerald' | 'blue' | 'purple' | 'amber';
}) {
  const colorClasses = {
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
    amber: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700',
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs opacity-80 mb-1">{title}</p>
          <p className="text-lg font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="opacity-50">{icon}</div>}
      </div>
    </div>
  );
}

export function ShipmentsChart({
  data,
  khatTypes = [],
  agents = [],
  title = 'الشحنات',
  description = 'إحصائيات الشحنات والحبات',
  showKhatTypes = true,
  showAgents = true,
}: ShipmentsChartProps) {
  // تحضير البيانات للرسم البياني
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map(stat => ({
      ...stat,
      date: formatDate(stat.date),
      fullDate: formatFullDate(stat.date),
    }));
  }, [data]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const totalShipments = data.reduce((sum, d) => sum + d.shipments, 0);
    const totalPieces = data.reduce((sum, d) => sum + d.pieces, 0);
    const totalFees = data.reduce((sum, d) => sum + d.fees, 0);
    const avgPiecesPerShipment = totalShipments > 0 ? totalPieces / totalShipments : 0;
    const avgFeePerPiece = totalPieces > 0 ? totalFees / totalPieces : 0;

    // أعلى يوم
    const topDay = data.reduce(
      (max, d) => d.pieces > max.pieces ? d : max,
      { pieces: 0, date: '', fees: 0, shipments: 0 }
    );

    return {
      totalShipments,
      totalPieces,
      totalFees,
      avgPiecesPerShipment,
      avgFeePerPiece,
      topDay,
    };
  }, [data]);

  // بيانات الرسم البياني الدائري للأنواع
  const khatTypesPieData = useMemo(() => {
    return khatTypes.slice(0, 8).map((kt, index) => ({
      name: kt.name,
      value: kt.pieces,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [khatTypes]);

  // أفضل الوكلاء
  const topAgents = useMemo(() => {
    return agents
      .sort((a, b) => b.pieces - a.pieces)
      .slice(0, 5);
  }, [agents]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد بيانات كافية لعرض الرسم البياني</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="إجمالي الشحنات"
          value={formatNumber(stats.totalShipments)}
          subtitle={`${formatNumber(data.length)} يوم`}
          icon={<Package className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="إجمالي الحبات"
          value={formatNumber(stats.totalPieces)}
          icon={<Leaf className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="متوسط الحبات/شحنة"
          value={formatNumber(Math.round(stats.avgPiecesPerShipment))}
          icon={<BarChart3 className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          title="متوسط الأجرة/حبة"
          value={stats.avgFeePerPiece.toFixed(2) + ' ريال'}
          icon={<TrendingUp className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* الرسوم البيانية الرئيسية */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="combined" className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="combined">مجمع</TabsTrigger>
              <TabsTrigger value="line">خطي</TabsTrigger>
              <TabsTrigger value="bar">أعمدة</TabsTrigger>
            </TabsList>

            {/* الرسم المجمع */}
            <TabsContent value="combined">
              <ChartContainer config={chartConfig} className="h-80 w-full">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      const data = payload?.[0]?.payload;
                      return data?.fullDate || value;
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    yAxisId="left"
                    dataKey="pieces"
                    name="الحبات"
                    fill={COLORS.pieces}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="shipments"
                    name="الشحنات"
                    stroke={COLORS.shipments}
                    strokeWidth={2}
                    dot={{ fill: COLORS.shipments, r: 4 }}
                  />
                </ComposedChart>
              </ChartContainer>
            </TabsContent>

            {/* الرسم الخطي */}
            <TabsContent value="line">
              <ChartContainer config={chartConfig} className="h-80 w-full">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      const data = payload?.[0]?.payload;
                      return data?.fullDate || value;
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="pieces"
                    name="الحبات"
                    stroke={COLORS.pieces}
                    strokeWidth={2}
                    dot={{ fill: COLORS.pieces, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="shipments"
                    name="الشحنات"
                    stroke={COLORS.shipments}
                    strokeWidth={2}
                    dot={{ fill: COLORS.shipments, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            {/* رسم الأعمدة */}
            <TabsContent value="bar">
              <ChartContainer config={chartConfig} className="h-80 w-full">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      const data = payload?.[0]?.payload;
                      return data?.fullDate || value;
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="pieces"
                    name="الحبات"
                    fill={COLORS.pieces}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="shipments"
                    name="الشحنات"
                    fill={COLORS.shipments}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* أنواع القات وأداء الوكلاء */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* توزيع أنواع القات */}
        {showKhatTypes && khatTypes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" />
                توزيع أنواع القات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {/* الرسم الدائري */}
                <div className="flex-1">
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <PieChart>
                      <Pie
                        data={khatTypesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {khatTypesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>

                {/* قائمة الأنواع */}
                <div className="flex-1 space-y-2">
                  {khatTypes.slice(0, 6).map((kt, index) => (
                    <div
                      key={kt.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="truncate max-w-[80px]">{kt.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatNumber(kt.pieces)}</span>
                        <Badge variant="outline" className="text-xs">
                          {kt.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* أداء الوكلاء */}
        {showAgents && agents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                أفضل الوكلاء أداءً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topAgents.map((agent, index) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-amber-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-700' :
                      'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(agent.pieces)} حبة • {agent.shipments} شحنة
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-600">
                        {formatCurrency(agent.fees)}
                      </p>
                      <p className="text-xs text-muted-foreground">ريال</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* أعلى يوم */}
      {stats.topDay.pieces > 0 && (
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-emerald-700">أعلى يوم في الحبات</p>
                  <p className="font-bold text-emerald-800">{formatFullDate(stats.topDay.date)}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-emerald-700">
                  {formatNumber(stats.topDay.pieces)}
                </p>
                <p className="text-xs text-emerald-600">حبة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ShipmentsChart;
