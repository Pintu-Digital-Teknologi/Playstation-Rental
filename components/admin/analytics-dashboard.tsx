"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  DollarSign,
  TrendingUp,
  Activity,
  Tv,
  Utensils,
  ShoppingBag,
  CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalAddOnRevenue: number;
    totalRentals: number;
    averageRevenuePerDay: number;
  };
  revenueByDate: Array<{
    _id: string;
    revenue: number;
    addOnRevenue: number;
    count: number;
  }>;
  tvUtilization: Array<{
    tvName: string;
    totalHours: number;
    rentalCount: number;
    revenue: number;
  }>;
  peakHours: Array<{
    _id: number;
    count: number;
  }>;
  rentalTypes: Array<{
    _id: string;
    count: number;
    revenue: number;
  }>;
  popularAddOns: Array<{
    _id: string;
    quantity: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    _id: string;
    count: number;
    revenue: number;
  }>;
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#14b8a6",
];

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState("30");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [singleDate, setSingleDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (days === "custom" && !dateRange?.from) return;
    if (days === "single" && !singleDate) return;
    fetchAnalytics();
  }, [days, dateRange, singleDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let query = "";
      if (days === "custom" && dateRange?.from) {
        query = `?from=${dateRange.from.toISOString()}`;
        if (dateRange.to) {
          query += `&to=${dateRange.to.toISOString()}`;
        }
      } else if (days === "single" && singleDate) {
        const isoDate = singleDate.toISOString();
        query = `?from=${isoDate}&to=${isoDate}`;
      } else {
        query = `?days=${days}`;
      }

      const response = await fetch(`/api/analytics/revenue${query}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const data = await response.json();
      setData(data);
      setError("");
    } catch (err) {
      setError("Failed to load analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading analytics data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "No data available"}</AlertDescription>
      </Alert>
    );
  }

  // Prepare Peak Hours Data
  const peakHoursData = Array.from({ length: 24 }, (_, i) => {
    const found = data.peakHours?.find((h) => h._id === i);
    return {
      hour: `${i.toString().padStart(2, "0")}:00`,
      count: found ? found.count : 0,
    };
  });

  const paymentMethodData =
    data.paymentMethods?.map((pm) => ({
      name: pm._id.charAt(0).toUpperCase() + pm._id.slice(1),
      value: pm.revenue,
      count: pm.count,
    })) || [];

  // Flatten revenue data for stack chart (revenue = total, we need base rental = total - addons)
  const chartData = data.revenueByDate.map((d) => ({
    ...d,
    baseRental: d.revenue - (d.addOnRevenue || 0),
    addOns: d.addOnRevenue || 0,
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Period Overview
          </h2>
          <p className="text-sm text-muted-foreground">
            Analyze business performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last Quarter</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
              <SelectItem value="single">Single Day</SelectItem>
              <SelectItem value="custom">Date Range</SelectItem>
            </SelectContent>
          </Select>

          {days === "single" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !singleDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {singleDate ? (
                    format(singleDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={singleDate}
                  onSelect={setSingleDate}
                  required
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {days === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +
              {(
                data.summary.totalRevenue /
                Math.max(data.summary.totalRentals, 1)
              ).toLocaleString("id-ID")}{" "}
              avg/order
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">F&B Revenue</CardTitle>
            <Utensils className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.totalAddOnRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(
                ((data.summary.totalAddOnRevenue || 0) /
                  Math.max(data.summary.totalRevenue, 1)) *
                100
              ).toFixed(1)}
              % of total revenue
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rentals</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.summary.totalRentals)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              completed sessions
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.averageRevenuePerDay)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              revenue per day
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Main Revenue Chart - Stacked */}
        <Card className="col-span-1 lg:col-span-4 hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Rental fees vs Add-ons (F&B)</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRental" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAddOns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="_id"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  }
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "baseRental"
                      ? "Rental Fees"
                      : name === "addOns"
                        ? "F&B / Add-ons"
                        : name,
                  ]}
                />
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <Legend iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="baseRental"
                  name="Base Rental"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="url(#colorRental)"
                />
                <Area
                  type="monotone"
                  dataKey="addOns"
                  name="Add-ons"
                  stackId="1"
                  stroke="#f97316"
                  fill="url(#colorAddOns)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Popular Add-ons List */}
        <Card className="col-span-1 lg:col-span-3 hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-accent" />
              Top Selling F&B
            </CardTitle>
            <CardDescription>
              Most popular menu items by revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.popularAddOns && data.popularAddOns.length > 0 ? (
              <div className="space-y-4">
                {data.popularAddOns.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                                     flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs
                                     ${idx === 0 ? "bg-yellow-500/20 text-yellow-600" : idx === 1 ? "bg-gray-400/20 text-gray-600" : idx === 2 ? "bg-orange-700/20 text-orange-700" : "bg-primary/10 text-primary"}
                                 `}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item._id}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} sold
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-sm">
                      {formatCurrency(item.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No add-on sales data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Hours Bar Chart */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>Busiest times of the day</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={peakHoursData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="hour"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                  formatter={(value: number) => [`${value} rentals`, "Volume"]}
                />
                <Bar
                  dataKey="count"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Chart */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Revenue share by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {paymentMethodData.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-sm border-b pb-1 last:border-0"
                >
                  <span className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                      }}
                    />
                    {item.name}
                  </span>
                  <div className="text-right">
                    <span className="font-medium mr-2">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({item.count} txns)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* TV Utilization Bar Chart */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>Unit Performance</CardTitle>
            <CardDescription>Revenue and usage hours by TV</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.tvUtilization}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="tvName"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#10b981"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#3b82f6"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val.toFixed(0)}h`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === "Revenue")
                      return [formatCurrency(value), name];
                    if (name === "Usage Hours")
                      return [`${parseFloat(value).toFixed(1)} hrs`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Revenue"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="totalHours"
                  name="Usage Hours"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table Section */}
      <h3 className="text-lg font-semibold tracking-tight mt-8">
        Detailed Unit Insights
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.tvUtilization.map((tv, idx) => (
          <Card
            key={idx}
            className="bg-secondary/20 hover:bg-secondary/40 transition-colors border-none"
          >
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">{tv.tvName}</span>
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                  Rank #{idx + 1}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="font-medium text-emerald-500">
                    {formatCurrency(tv.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hours Played</p>
                  <p className="font-medium">{tv.totalHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Sessions
                  </p>
                  <p className="font-medium">{tv.rentalCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Session</p>
                  <p className="font-medium">
                    {(tv.totalHours / Math.max(tv.rentalCount, 1)).toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
