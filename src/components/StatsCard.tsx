import React from "react";

type StatsCardProps = {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  positive: boolean;
};

export function StatsCard({
  title,
  value,
  change,
  icon,
  positive,
}: StatsCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-xl ${
            positive
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          } group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
        <div
          className={`text-sm font-medium ${
            positive ? "text-green-400" : "text-red-400"
          }`}
        >
          {change}
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
    </div>
  );
}
