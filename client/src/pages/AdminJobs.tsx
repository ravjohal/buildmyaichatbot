import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, XCircle, Eye, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type IndexingJob = {
  id: string;
  chatbotId: string;
  status: string;
  totalTasks: string;
  completedTasks: string;
  failedTasks: string;
  cancelledTasks: string;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  chatbot?: {
    id: string;
    name: string;
    userId: string;
    userEmail: string;
    userName: string;
  };
};

type IndexingTask = {
  id: string;
  jobId: string;
  chatbotId: string;
  sourceType: string;
  sourceUrl: string;
  status: string;
  retryCount: string;
  chunksCreated: string;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

type JobDetails = IndexingJob & {
  tasks: IndexingTask[];
};

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "processing":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "completed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "failed":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "partial":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "cancelled":
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
      return <Clock className="w-3 h-3" />;
    case "processing":
      return <Loader2 className="w-3 h-3 animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-3 h-3" />;
    case "failed":
      return <AlertCircle className="w-3 h-3" />;
    case "partial":
      return <AlertCircle className="w-3 h-3" />;
    case "cancelled":
      return <XCircle className="w-3 h-3" />;
    default:
      return null;
  }
}

export default function AdminJobs() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<IndexingJob[]>({
    queryKey: ['/api/admin/indexing-jobs', selectedStatus],
    queryFn: async () => {
      const params = selectedStatus !== "all" ? `?status=${selectedStatus}` : "";
      const response = await fetch(`/api/admin/indexing-jobs${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json();
    },
    refetchInterval: 3000,
  });

  const { data: jobDetails, isLoading: detailsLoading } = useQuery<JobDetails>({
    queryKey: ['/api/admin/indexing-jobs', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;
      const response = await fetch(`/api/admin/indexing-jobs/${selectedJobId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch job details");
      return response.json();
    },
    enabled: !!selectedJobId,
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/admin/indexing-jobs/${jobId}/cancel`, {});
    },
    onSuccess: () => {
      toast({
        title: "Job Cancelled",
        description: "The indexing job has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/indexing-jobs'] });
      setSelectedJobId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/admin/indexing-jobs/${jobId}/retry`, {});
    },
    onSuccess: () => {
      toast({
        title: "Job Retry Initiated",
        description: "A new job has been created to retry the failed tasks.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/indexing-jobs'] });
      setSelectedJobId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredJobs = selectedStatus === "all" 
    ? jobs 
    : jobs.filter(job => job.status === selectedStatus);

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Indexing Jobs</h1>
              <p className="text-muted-foreground">Monitor and manage background indexing jobs</p>
            </div>
            <Button 
              onClick={() => refetchJobs()} 
              variant="outline" 
              size="sm"
              data-testid="button-refresh-jobs"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
              <TabsTrigger value="processing" data-testid="tab-processing">Processing</TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
              <TabsTrigger value="failed" data-testid="tab-failed">Failed</TabsTrigger>
              <TabsTrigger value="partial" data-testid="tab-partial">Partial</TabsTrigger>
              <TabsTrigger value="cancelled" data-testid="tab-cancelled">Cancelled</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStatus} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Jobs Overview</CardTitle>
                  <CardDescription>
                    Showing {jobs.length} {selectedStatus === "all" ? "" : selectedStatus} job{jobs.length !== 1 ? 's' : ''} (latest 500 max)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No jobs found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Chatbot</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredJobs.map((job) => {
                            const total = parseInt(job.totalTasks);
                            const completed = parseInt(job.completedTasks);
                            const failed = parseInt(job.failedTasks);
                            const cancelled = parseInt(job.cancelledTasks || "0");
                            const progress = total > 0 ? ((completed + failed + cancelled) / total) * 100 : 0;

                            const startTime = job.startedAt ? new Date(job.startedAt) : null;
                            const endTime = job.completedAt ? new Date(job.completedAt) : new Date();
                            const durationMs = startTime ? endTime.getTime() - startTime.getTime() : 0;
                            const durationSec = Math.floor(durationMs / 1000);

                            return (
                              <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                                <TableCell>
                                  <Badge variant="outline" className={getStatusColor(job.status)}>
                                    <span className="flex items-center gap-1">
                                      {getStatusIcon(job.status)}
                                      {job.status}
                                    </span>
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{job.chatbot?.name || "Unknown"}</div>
                                  <div className="text-xs text-muted-foreground">{job.chatbotId.slice(0, 8)}...</div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{job.chatbot?.userName || "Unknown"}</div>
                                  <div className="text-xs text-muted-foreground">{job.chatbot?.userEmail}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-green-500">{completed} ✓</span>
                                      {failed > 0 && <span className="text-red-500">{failed} ✗</span>}
                                      {cancelled > 0 && <span className="text-gray-500">{cancelled} ⊗</span>}
                                      <span className="text-muted-foreground">/ {total}</span>
                                    </div>
                                    <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary transition-all" 
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {job.startedAt && (
                                    <div className="text-sm">
                                      {durationSec < 60 
                                        ? `${durationSec}s` 
                                        : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedJobId(job.id)}
                                      data-testid={`button-view-${job.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {(job.status === "pending" || job.status === "processing") && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => cancelMutation.mutate(job.id)}
                                        disabled={cancelMutation.isPending}
                                        data-testid={`button-cancel-${job.id}`}
                                      >
                                        <XCircle className="w-4 h-4 text-red-500" />
                                      </Button>
                                    )}
                                    {(job.status === "failed" || job.status === "partial" || job.status === "cancelled") && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => retryMutation.mutate(job.id)}
                                        disabled={retryMutation.isPending}
                                        data-testid={`button-retry-${job.id}`}
                                      >
                                        <RefreshCw className="w-4 h-4 text-blue-500" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={!!selectedJobId} onOpenChange={(open) => !open && setSelectedJobId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              Detailed information about the indexing job and its tasks
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : jobDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Job ID</div>
                  <div className="font-mono text-sm">{jobDetails.id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant="outline" className={getStatusColor(jobDetails.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(jobDetails.status)}
                      {jobDetails.status}
                    </span>
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Chatbot</div>
                  <div className="font-medium">{jobDetails.chatbot?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">User</div>
                  <div className="font-medium">{jobDetails.chatbot?.userName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="text-sm">{new Date(jobDetails.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                  <div className="text-sm">
                    {jobDetails.completedAt ? new Date(jobDetails.completedAt).toLocaleString() : "In progress"}
                  </div>
                </div>
              </div>

              {jobDetails.errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <div className="text-sm font-medium text-red-500">Error</div>
                  <div className="text-sm text-red-500/80">{jobDetails.errorMessage}</div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">Tasks ({jobDetails.tasks.length})</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Chunks</TableHead>
                        <TableHead>Retries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobDetails.tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(task.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(task.status)}
                                {task.status}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{task.sourceType}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md truncate text-sm">{task.sourceUrl}</div>
                            {task.errorMessage && (
                              <div className="text-xs text-red-500 mt-1">{task.errorMessage}</div>
                            )}
                          </TableCell>
                          <TableCell>{task.chunksCreated}</TableCell>
                          <TableCell>{task.retryCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {(jobDetails.status === "pending" || jobDetails.status === "processing") && (
                  <Button
                    variant="destructive"
                    onClick={() => cancelMutation.mutate(jobDetails.id)}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-job-details"
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Cancel Job
                  </Button>
                )}
                {(jobDetails.status === "failed" || jobDetails.status === "partial" || jobDetails.status === "cancelled") && (
                  <Button
                    onClick={() => retryMutation.mutate(jobDetails.id)}
                    disabled={retryMutation.isPending}
                    data-testid="button-retry-job-details"
                  >
                    {retryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Retry Failed Tasks
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
