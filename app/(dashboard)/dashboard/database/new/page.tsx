'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function NewDatabasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    orgName: '',
    databaseType: 'oracle',
    connectionString: '',
    username: '',
    password: '',
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, databaseType: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Create connection info JSON
      const connectionInfo = {
        user: formData.username,
        password: formData.password,
        connectString: formData.connectionString,
        libDir: ''
      };
      
      // Get user ID from localStorage
      const userId = localStorage.getItem('userId');
      
      // Send request to create new database connection
      const response = await fetch('/api/databases/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgName: formData.orgName,
          databaseType: formData.databaseType,
          connectionInfo: JSON.stringify(connectionInfo),
          description: formData.description,
          userId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create database connection');
      }
      
      // Success
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error creating database connection:', err);
      setError(err.message || 'An error occurred while creating the database connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <Database className="mr-2 h-6 w-6 text-indigo-500" />
        Add New Database Connection
      </h1>
      
      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700">
            Database connection created successfully. Redirecting...
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Error</AlertTitle>
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Database Connection Details</CardTitle>
          <CardDescription>
            Enter the details for your new database connection. This information will be used to connect to your database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization/Database Name</Label>
              <Input
                id="orgName"
                name="orgName"
                value={formData.orgName}
                onChange={handleChange}
                placeholder="My Company Database"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="databaseType">Database Type</Label>
              <Select 
                value={formData.databaseType} 
                onValueChange={handleSelectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oracle">Oracle</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="sqlserver">SQL Server</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="connectionString">Connection String</Label>
              <Input
                id="connectionString"
                name="connectionString"
                value={formData.connectionString}
                onChange={handleChange}
                placeholder="hostname:port/service_name"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="db_user"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of this database connection"
                rows={3}
              />
            </div>
            
            <CardFooter className="px-0 pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Database Connection'}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
