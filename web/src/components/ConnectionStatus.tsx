"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import safeVisionAPI from '@/lib/services/safevisionApi';

interface ConnectionStatusProps {
  onStatusChange?: (isConnected: boolean) => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ onStatusChange }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  const checkConnection = async () => {
    setIsChecking(true);
    console.log('🔍 ConnectionStatus: Starting connection check...');
    
    try {
      const startTime = Date.now();
      console.log('🔍 ConnectionStatus: Calling safeVisionAPI.checkConnection()...');
      
      const isOnline = await safeVisionAPI.checkConnection();
      const responseTime = Date.now() - startTime;
      
      console.log(`🔍 ConnectionStatus: checkConnection result: ${isOnline}, response time: ${responseTime}ms`);
      
      if (isOnline) {
        console.log('🔍 ConnectionStatus: Connection successful, fetching health data...');
        const health = await safeVisionAPI.getHealth();
        console.log('🔍 ConnectionStatus: Health data:', health);
        
        setConnectionInfo({
          status: health.status,
          responseTime,
          uptime: health.uptime_seconds,
          version: health.version,
          model: health.model_loaded
        });
      } else {
        console.log('🔍 ConnectionStatus: Connection failed, no health data');
        setConnectionInfo(null);
      }
      
      setIsConnected(isOnline);
      setLastCheck(new Date());
      onStatusChange?.(isOnline);
      
      console.log(`✅ ConnectionStatus: Final result - Connected: ${isOnline}`);
    } catch (error) {
      console.error('❌ ConnectionStatus: Connection check failed:', error);
      console.error('❌ ConnectionStatus: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      setIsConnected(false);
      setConnectionInfo(null);
      setLastCheck(new Date());
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
      console.log('🔍 ConnectionStatus: Connection check completed');
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  const getStatusColor = () => {
    if (isConnected === null) return 'bg-gray-500';
    return isConnected ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusIcon = () => {
    if (isChecking) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (isConnected === null) return <XCircle className="w-4 h-4" />;
    return isConnected ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="relative">
            {getStatusIcon()}
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor()}`} />
          </span>
          SafeVision GPU Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected === null 
              ? 'Checking...' 
              : isConnected 
                ? 'Online' 
                : 'Offline'
            }
          </Badge>
          {lastCheck && (
            <span className="text-sm text-gray-500">
              Last check: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Connection Details */}
        {isConnected && connectionInfo && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600">Response:</span>
                <span className="ml-1 font-medium">{connectionInfo.responseTime}ms</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-1 font-medium">{connectionInfo.status}</span>
              </div>
              <div>
                <span className="text-gray-600">Uptime:</span>
                <span className="ml-1 font-medium">{formatUptime(connectionInfo.uptime)}</span>
              </div>
              <div>
                <span className="text-gray-600">Version:</span>
                <span className="ml-1 font-medium">v{connectionInfo.version}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">GPU Model:</span>
              <Badge variant={connectionInfo.model ? "default" : "outline"} className="bg-green-100 text-green-800">
                {connectionInfo.model ? 'Loaded' : 'Not Loaded'}
              </Badge>
            </div>
          </div>
        )}

        {/* Manual Refresh Button */}
        <button
          onClick={checkConnection}
          disabled={isChecking}
          className="w-full py-2 px-3 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors disabled:opacity-50"
        >
          {isChecking ? 'Checking...' : 'Refresh Status'}
        </button>

        {/* Error Alert */}
        {!isConnected && !isChecking && (
          <Alert>
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              Unable to connect to SafeVision GPU API. Please check your network connection and try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;
