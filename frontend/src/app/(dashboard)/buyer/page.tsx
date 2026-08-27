import React from "react";
import Link from "next/link";
import { Heart, Bell, History, Search, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BuyerDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Buyer Account & Saved Inquiries
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track properties you have saved, inquiries sent to agents, and custom price alerts.
        </p>
      </div>

      {/* Tabs / Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
              <Heart className="h-5 w-5" />
            </div>
            <Badge variant="secondary">3 Properties</Badge>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Saved Properties</h3>
            <p className="text-xs text-slate-500 mt-1">
              Shortlisted houses and apartments for quick comparison.
            </p>
          </div>
          <Link href="/properties">
            <Button variant="outline" size="sm" className="w-full text-xs">
              View Saved Items
            </Button>
          </Link>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <Bell className="h-5 w-5" />
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Saved Search Alerts</h3>
            <p className="text-xs text-slate-500 mt-1">
              Get notified when 1 Kanal houses in DHA Phase 6 drop in price.
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs">
            Manage Alerts
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <History className="h-5 w-5" />
            </div>
            <Badge variant="secondary">4 Inquiries</Badge>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Agent Inquiries</h3>
            <p className="text-xs text-slate-500 mt-1">
              History of WhatsApp chats and messages sent to verified sellers.
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs">
            View History
          </Button>
        </Card>
      </div>

      {/* Suggested Matches */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended for Your Budget (Lahore)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center space-y-3">
            <Home className="h-10 w-10 mx-auto text-slate-300" />
            <p className="text-sm text-slate-500">
              Discover properties that match your recent search criteria.
            </p>
            <Link href="/properties">
              <Button size="sm" className="gap-2 font-semibold">
                <span>Browse Matching Properties</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
