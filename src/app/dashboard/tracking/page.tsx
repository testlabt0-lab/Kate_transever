'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Navigation,
  Clock,
  Loader2,
  RefreshCw,
  Truck,
  User,
  Battery,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Radio,
} from 'lucide-react';

// ==================== الأنواع ====================
interface User {
  id: string;
  username: string;
  role: string;
}

interface DeliveryPerson {
  id: string;
  name: string;
  phone: string | null;
}

interface DeliveryLocation {
  id: string;
  deliveryPersonId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  battery: number | null;
  createdAt: string;
}

interface DeliveryTrip {
  id: string;
  deliveryPersonId: string;
  shipmentId: string | null;
  startTime: string;
  endTime: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startLocation: string | null;
  endLocation: string | null;
  distance: number;
  notes: string | null;
  duration: number | null;
}

interface DeliveryPersonWithLocation extends DeliveryPerson {
  lastLocation: DeliveryLocation | null;
  activeTrip: DeliveryTrip | null;
}

// ==================== المكون الرئيسي ====================
export default function TrackingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // البيانات
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [deliveryPersonsWithData, setDeliveryPersonsWithData] = useState<DeliveryPersonWithLocation[]>([]);

  // الموقع المحدد للخريطة
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // التحقق من الجلسة
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('session_token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
          window.location.href = '/';
          return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);
      } catch {
        window.location.href = '/';
      }
    };

    checkAuth();
  }, []);

  // تحميل البيانات
  const loadData = useCallback(async () => {
    try {
      // جلب الموصلين
      const personsRes = await fetch('/api/delivery-persons');
      const personsData = await personsRes.json();

      // جلب المواقع
      const locationsRes = await fetch('/api/delivery-locations?limit=500');
      const locationsData = await locationsRes.json();

      // جلب الرحلات النشطة
      const tripsRes = await fetch('/api/delivery-trips?status=IN_PROGRESS');
      const tripsData = await tripsRes.json();

      if (personsData.success) {
        setDeliveryPersons(personsData.data || []);
      }

      if (locationsData.success) {
        setLocations(locationsData.data || []);
      }

      if (tripsData.success) {
        setTrips(tripsData.data || []);
      }

      // دمج البيانات
      if (personsData.success && locationsData.success && tripsData.success) {
        const merged = (personsData.data || []).map((person: DeliveryPerson) => {
          // آخر موقع للموصل
          const personLocations = (locationsData.data || []).filter(
            (loc: DeliveryLocation) => loc.deliveryPersonId === person.id
          );
          const lastLocation = personLocations[0] || null;

          // الرحلة النشطة
          const activeTrip = (tripsData.data || []).find(
            (trip: DeliveryTrip) => trip.deliveryPersonId === person.id
          ) || null;

          return {
            ...person,
            lastLocation,
            activeTrip,
          };
        });

        setDeliveryPersonsWithData(merged);

        // تحديد أول موقع للخريطة
        if (!selectedLocation && merged.length > 0 && merged[0].lastLocation) {
          setSelectedLocation({
            lat: merged[0].lastLocation.latitude,
            lng: merged[0].lastLocation.longitude,
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // التحديث التلقائي كل 30 ثانية
  useEffect(() => {
    if (!autoRefreshEnabled || !user) return;

    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, user, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // تنسيق الوقت
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // تنسيق التاريخ والوقت
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // حساب الوقت المنقضي
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${Math.floor(diffHours / 24)} يوم`;
  };

  // تنسيق الموقع
  const formatLocation = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}، ${lng.toFixed(6)}`;
  };

  // إنشاء رابط OpenStreetMap
  const getMapUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
  };

  // إحصائيات
  const activeTripsCount = deliveryPersonsWithData.filter(p => p.activeTrip).length;
  const onlinePersonsCount = deliveryPersonsWithData.filter(p => {
    if (!p.lastLocation) return false;
    const lastUpdate = new Date(p.lastLocation.createdAt);
    const now = new Date();
    const diffMins = (now.getTime() - lastUpdate.getTime()) / 60000;
    return diffMins < 30; // أقل من 30 دقيقة
  }).length;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole={user.role as 'ADMIN' | 'WORKER'}
      username={user.username}
      onLogout={handleLogout}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* العنوان والتحديث */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Navigation className="h-6 w-6 text-emerald-600" />
              تتبع الموصلين
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefreshEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className="gap-2"
            >
              <Radio className={`h-4 w-4 ${autoRefreshEnabled ? 'animate-pulse' : ''}`} />
              {autoRefreshEnabled ? 'تحديث تلقائي' : 'متوقف'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-200 dark:bg-emerald-800">
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">إجمالي الموصلين</p>
                  <p className="text-xl font-bold text-emerald-600">{deliveryPersons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-200 dark:bg-green-800">
                  <Radio className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300">متصلين</p>
                  <p className="text-xl font-bold text-green-600">{onlinePersonsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-200 dark:bg-blue-800">
                  <Truck className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">رحلات نشطة</p>
                  <p className="text-xl font-bold text-blue-600">{activeTripsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-purple-200 dark:bg-purple-800">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-purple-700 dark:text-purple-300">سجلات الموقع</p>
                  <p className="text-xl font-bold text-purple-600">{locations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* الخريطة */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg">الخريطة</CardTitle>
                </div>
                {selectedLocation && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {formatLocation(selectedLocation.lat, selectedLocation.lng)}
                  </Badge>
                )}
              </div>
              <CardDescription>
                موقع الموصلين على الخريطة
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {selectedLocation ? (
                <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px]">
                  <iframe
                    src={getMapUrl(selectedLocation.lat, selectedLocation.lng)}
                    className="w-full h-full border-0"
                    title="خريطة الموقع"
                    loading="lazy"
                  />
                  <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded text-xs text-muted-foreground">
                    OpenStreetMap
                  </div>
                </div>
              ) : (
                <div className="h-[300px] sm:h-[400px] md:h-[500px] flex items-center justify-center bg-muted/50">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>لا توجد مواقع مسجلة</p>
                    <p className="text-sm mt-1">اختر موصل من القائمة لعرض موقعه</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* قائمة الموصلين */}
          <Card className="lg:col-span-1">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">قائمة الموصلين</CardTitle>
              </div>
              <CardDescription>
                {deliveryPersonsWithData.length} موصل
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px] sm:h-[400px] md:h-[500px]">
                {deliveryPersonsWithData.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>لا يوجد موصلين</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {deliveryPersonsWithData.map((person) => {
                      const isActive = person.activeTrip !== null;
                      const isOnline = person.lastLocation &&
                        (new Date().getTime() - new Date(person.lastLocation.createdAt).getTime()) < 30 * 60 * 1000;

                      return (
                        <div
                          key={person.id}
                          className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                            selectedLocation?.lat === person.lastLocation?.latitude &&
                            selectedLocation?.lng === person.lastLocation?.longitude
                              ? 'bg-muted'
                              : ''
                          }`}
                          onClick={() => {
                            if (person.lastLocation) {
                              setSelectedLocation({
                                lat: person.lastLocation.latitude,
                                lng: person.lastLocation.longitude,
                              });
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-full ${
                                isActive ? 'bg-blue-100 dark:bg-blue-900' :
                                isOnline ? 'bg-green-100 dark:bg-green-900' :
                                'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                <User className={`h-4 w-4 ${
                                  isActive ? 'text-blue-600' :
                                  isOnline ? 'text-green-600' :
                                  'text-gray-400'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{person.name}</p>
                                {person.phone && (
                                  <p className="text-xs text-muted-foreground">{person.phone}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              {isActive && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">
                                  <Truck className="h-3 w-3 me-1" />
                                  في رحلة
                                </Badge>
                              )}
                              {isOnline && !isActive && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  <Radio className="h-3 w-3 me-1" />
                                  متصل
                                </Badge>
                              )}
                              {!isOnline && !isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  غير متصل
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* معلومات الموقع */}
                          {person.lastLocation && (
                            <div className="mt-2 p-2 rounded-lg bg-muted/50 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  الموقع:
                                </span>
                                <span className="font-mono">
                                  {formatLocation(person.lastLocation.latitude, person.lastLocation.longitude)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  آخر تحديث:
                                </span>
                                <span>{getTimeAgo(person.lastLocation.createdAt)}</span>
                              </div>
                              {person.lastLocation.battery !== null && (
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Battery className="h-3 w-3" />
                                    البطارية:
                                  </span>
                                  <span className={
                                    person.lastLocation.battery > 50 ? 'text-green-600' :
                                    person.lastLocation.battery > 20 ? 'text-amber-600' :
                                    'text-red-600'
                                  }>
                                    {person.lastLocation.battery}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* معلومات الرحلة النشطة */}
                          {person.activeTrip && (
                            <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  الرحلة النشطة:
                                </span>
                                <span className="text-blue-600">
                                  بدأت {formatTime(person.activeTrip.startTime)}
                                </span>
                              </div>
                              {person.activeTrip.startLocation && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">من:</span>
                                  <span>{person.activeTrip.startLocation}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* الرحلات النشطة */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">الرحلات النشطة</CardTitle>
              </div>
              <Badge variant="secondary">
                {trips.length} رحلة
              </Badge>
            </div>
            <CardDescription>
              الرحلات الجارية حالياً
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {trips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-50" />
                <p>لا توجد رحلات نشطة حالياً</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {trips.map((trip) => {
                  const person = deliveryPersons.find(p => p.id === trip.deliveryPersonId);
                  return (
                    <div
                      key={trip.id}
                      className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900">
                            <Truck className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-sm">{person?.name || 'غير معروف'}</span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          جارية
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            وقت البداية:
                          </span>
                          <span>{formatDateTime(trip.startTime)}</span>
                        </div>

                        {trip.duration && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">المدة:</span>
                            <span>{trip.duration} دقيقة</span>
                          </div>
                        )}

                        {trip.startLocation && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">من:</span>
                            <span>{trip.startLocation}</span>
                          </div>
                        )}

                        {trip.distance > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">المسافة:</span>
                            <span>{trip.distance.toFixed(2)} كم</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* آخر المواقع المسجلة */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">آخر المواقع المسجلة</CardTitle>
              </div>
              <Badge variant="secondary">
                {locations.length} سجل
              </Badge>
            </div>
            <CardDescription>
              آخر 20 موقع تم تسجيله
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {locations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>لا توجد مواقع مسجلة</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {locations.slice(0, 20).map((location) => {
                    const person = deliveryPersons.find(p => p.id === location.deliveryPersonId);
                    return (
                      <div
                        key={location.id}
                        className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          setSelectedLocation({
                            lat: location.latitude,
                            lng: location.longitude,
                          });
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900">
                            <MapPin className="h-3 w-3 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{person?.name || 'غير معروف'}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {formatLocation(location.latitude, location.longitude)}
                            </p>
                          </div>
                        </div>
                        <div className="text-left text-xs">
                          <p>{formatTime(location.createdAt)}</p>
                          <p className="text-muted-foreground">{getTimeAgo(location.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* ملاحظة */}
        <Card className="bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">ملاحظة</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  يتم تحديث البيانات تلقائياً كل 30 ثانية. يمكنك النقر على أي موصل لعرض موقعه على الخريطة.
                  الموقع يُعرض بصيغة: خط العرض، خط الطول.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
