'use client';

import { Gavel, FolderKanban, Truck, AlertCircle, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-sm text-slate-500">Welcome back! Here is what is happening today.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Bids</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">24</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Gavel className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="mr-1 h-4 w-4 text-emerald-500" />
            <span className="text-emerald-500 font-medium">+12%</span>
            <span className="ml-2 text-slate-400">from last month</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Ongoing Projects</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">12</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <FolderKanban className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-500" />
            <span className="text-slate-500">3 completing this week</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Deliveries</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">8</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Truck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Clock className="mr-1 h-4 w-4 text-amber-500" />
            <span className="text-slate-500">Requires attention</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Exceptions</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">3</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-red-500 font-medium">Review needed</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Recent Activity Report</h2>
        </div>
        <div className="flex h-96 items-center justify-center bg-slate-50 text-slate-400">
          [ Detailed Data Table or Chart Will Go Here ]
        </div>
      </div>
    </>
  );
}