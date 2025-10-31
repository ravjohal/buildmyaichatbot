import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, Upload, FileText, X, Plus, Loader2 } from "lucide-react";
import type { InsertChatbot } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface StepKnowledgeBaseProps {
  formData: Partial<InsertChatbot> & { documentMetadata?: DocumentMetadata[] };
  updateFormData: (updates: Partial<InsertChatbot> & { documentContent?: string; documentMetadata?: DocumentMetadata[] }) => void;
}

interface DocumentMetadata {
  path: string;
  originalName: string;
  title: string;
  text: string;
  size: number;
  type: string;
}

export function StepKnowledgeBase({ formData, updateFormData }: StepKnowledgeBaseProps) {
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const { toast } = useToast();
  
  // Get document metadata from formData (persisted across remounts)
  const documentMetadata = (formData.documentMetadata || []) as DocumentMetadata[];

  const handleAddUrl = () => {
    setUrlError("");
    
    if (!newUrl.trim()) {
      setUrlError("Please enter a URL");
      return;
    }

    try {
      new URL(newUrl.trim());
    } catch {
      setUrlError("Please enter a valid URL");
      return;
    }

    const currentUrls = formData.websiteUrls || [];
    if (currentUrls.includes(newUrl.trim())) {
      setUrlError("This URL has already been added");
      return;
    }

    updateFormData({ 
      websiteUrls: [...currentUrls, newUrl.trim()] 
    });
    setNewUrl("");
  };

  const handleRemoveUrl = (index: number) => {
    const newUrls = [...(formData.websiteUrls || [])];
    newUrls.splice(index, 1);
    updateFormData({ websiteUrls: newUrls });
  };

  const handleRemoveDocument = (index: number) => {
    const newDocs = [...(formData.documents || [])];
    const newMetadata = [...documentMetadata];
    
    newDocs.splice(index, 1);
    newMetadata.splice(index, 1);
    
    // Rebuild document content from remaining documents
    const documentContent = newMetadata
      .map(doc => `Document: ${doc.title}\n\n${doc.text}`)
      .join('\n\n---\n\n');
    
    updateFormData({ 
      documents: newDocs,
      documentMetadata: newMetadata,
      documentContent: documentContent || undefined
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedExtensions = ['.pdf', '.txt', '.md'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, TXT, or MD file.",
        variant: "destructive",
      });
      event.target.value = ''; // Reset input
      return;
    }

    setUploadingDoc(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formDataObj,
        credentials: 'include', // Important for authentication
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Add document to the list
      const currentDocs = formData.documents || [];
      const newDocMetadata = result.document;
      
      const updatedMetadata = [...documentMetadata, newDocMetadata];
      
      // Build combined document content
      const documentContent = updatedMetadata
        .map(doc => `Document: ${doc.title}\n\n${doc.text}`)
        .join('\n\n---\n\n');
      
      updateFormData({ 
        documents: [...currentDocs, newDocMetadata.path],
        documentMetadata: updatedMetadata,
        documentContent
      });

      toast({
        title: "Document uploaded",
        description: `${file.name} has been successfully uploaded and processed.`,
      });

    } catch (error: any) {
      console.error("Document upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Knowledge Base Setup</h2>
        <p className="text-muted-foreground mt-2">
          Provide content for your chatbot to learn from. This will be used to answer customer questions.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="websiteUrl" className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website URLs (Optional)
          </Label>
          <div className="flex gap-2">
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://www.yourbusiness.com"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setUrlError("");
              }}
              onKeyPress={handleKeyPress}
              className="h-11 flex-1"
              data-testid="input-website-url"
            />
            <Button
              type="button"
              onClick={handleAddUrl}
              className="h-11"
              data-testid="button-add-url"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add URL
            </Button>
          </div>
          {urlError && (
            <p className="text-sm text-destructive">{urlError}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Add website URLs to automatically crawl and extract content. Your chatbot will learn from the content on these pages.
          </p>
        </div>

        {formData.websiteUrls && formData.websiteUrls.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Added URLs</Label>
            {formData.websiteUrls.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                data-testid={`url-item-${index}`}
              >
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm truncate">{url}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveUrl(index)}
                  data-testid={`button-remove-url-${index}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Documents (Optional)
          </Label>
          <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Upload PDF, TXT, or MD files to add to your chatbot's knowledge base
            </p>
            <Button 
              variant="secondary" 
              disabled={uploadingDoc}
              data-testid="button-upload-docs"
              onClick={() => document.getElementById('doc-upload-input')?.click()}
            >
              {uploadingDoc ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </>
              )}
            </Button>
            <input
              id="doc-upload-input"
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {documentMetadata && documentMetadata.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Uploaded Documents</Label>
              {documentMetadata.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                  data-testid={`doc-item-${index}`}
                >
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{doc.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.size / 1024).toFixed(1)} KB • {doc.text.length} characters extracted
                    </p>
                  </div>
                  <Badge variant="secondary" className="no-default-active-elevate">
                    {doc.type.toUpperCase()}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDocument(index)}
                    data-testid={`button-remove-doc-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
