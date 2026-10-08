import { Card, CardContent } from "@/components/ui/card";
import { FileText, Eye, Heart, MessageSquare } from "lucide-react";

export default function PublisherStats({ totalArticles, totalViews, totalLikes, totalComments }) {
  const stats = [
    { label: "Published Articles", value: totalArticles, icon: FileText, color: "text-blue-600" },
    { label: "Total Views", value: totalViews, icon: Eye, color: "text-green-600" },
    { label: "Total Likes", value: totalLikes, icon: Heart, color: "text-red-600" },
    { label: "Total Comments", value: totalComments, icon: MessageSquare, color: "text-purple-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}/10`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}