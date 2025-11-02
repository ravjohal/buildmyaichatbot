import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface IndexingJob {
  jobId: string;
  chatbotId: string;
  chatbotName: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  progressPercentage: number;
  startedAt: Date | null;
}

export function IndexingStatusBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const { data: jobs = [], isLoading } = useQuery<IndexingJob[]>({
    queryKey: ["/api/indexing/status"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (jobs.length > 0) {
      setIsHidden(false);
    }
  }, [jobs.length, jobs]);

  if (isLoading || jobs.length === 0) {
    return null;
  }

  if (isHidden) {
    return null;
  }

  const totalCompleted = jobs.reduce((sum, job) => sum + job.completedTasks, 0);
  const totalTasks = jobs.reduce((sum, job) => sum + job.totalTasks, 0);
  const totalProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div className="w-full bg-navy border-b border-navy-border" data-testid="banner-indexing-status">
      {!isExpanded ? (
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Loader2 className="h-4 w-4 animate-spin text-bright-blue flex-shrink-0" data-testid="icon-indexing-spinner" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-medium text-white">
                  {jobs.length === 1 
                    ? `Indexing ${jobs[0].chatbotName}...` 
                    : `Indexing ${jobs.length} chatbots...`}
                </span>
                <span className="text-sm text-bright-blue font-semibold" data-testid="text-progress-percentage">
                  {Math.round(totalProgress)}%
                </span>
              </div>
              <Progress 
                value={totalProgress} 
                className="h-1.5 bg-navy-elevated"
                data-testid="progress-bar-total"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(true)}
              className="h-8 w-8 text-white/70 hover-elevate"
              data-testid="button-expand-banner"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsHidden(true)}
              className="h-8 w-8 text-white/70 hover-elevate"
              data-testid="button-dismiss-banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3" data-testid="banner-indexing-expanded">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-bright-blue" />
              <span className="text-sm font-semibold text-white">
                Indexing Progress
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8 text-white/70 hover-elevate"
                data-testid="button-collapse-banner"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsHidden(true)}
                className="h-8 w-8 text-white/70 hover-elevate"
                data-testid="button-dismiss-banner-expanded"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <div 
                key={job.jobId} 
                className="bg-navy-elevated rounded-md p-3"
                data-testid={`job-card-${job.chatbotId}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {job.chatbotName}
                  </span>
                  <span 
                    className="text-sm text-bright-blue font-semibold"
                    data-testid={`text-job-progress-${job.chatbotId}`}
                  >
                    {job.progressPercentage}%
                  </span>
                </div>
                <Progress 
                  value={job.progressPercentage} 
                  className="h-2 mb-2 bg-navy"
                  data-testid={`progress-bar-${job.chatbotId}`}
                />
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    Processing {job.completedTasks} of {job.totalTasks} {job.totalTasks === 1 ? 'item' : 'items'}
                  </span>
                  {job.failedTasks > 0 && (
                    <span className="text-red-400">
                      {job.failedTasks} failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-navy-border">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Overall Progress</span>
              <span className="font-medium text-white">
                {totalCompleted} / {totalTasks} items
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
