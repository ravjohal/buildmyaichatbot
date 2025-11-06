// Referenced from javascript_object_storage blueprint
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path !== "")
      )
    );
    return paths;
  }

  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "";
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    const searchPaths = this.getPublicObjectSearchPaths();
    
    for (const searchPath of searchPaths) {
      const [bucketName, ...prefixParts] = searchPath.split("/").filter(Boolean);
      const prefix = prefixParts.join("/");
      const fullPath = prefix ? `${prefix}/${filePath}` : filePath;
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(fullPath);
      
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    
    return null;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    const privateDir = this.getPrivateObjectDir();
    if (!privateDir) {
      throw new Error("Object storage not configured: PRIVATE_OBJECT_DIR environment variable is missing");
    }
    
    const [bucketName, ...pathParts] = privateDir.split("/").filter(Boolean);
    if (!bucketName) {
      throw new Error("Invalid object storage configuration: bucket name could not be determined");
    }
    
    const cleanPath = objectPath.startsWith("/objects/")
      ? objectPath.substring("/objects/".length)
      : objectPath;
    
    const fullPath = [...pathParts, cleanPath].join("/");
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(fullPath);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    
    return file;
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateDir = this.getPrivateObjectDir();
    if (!privateDir) {
      throw new Error("Object storage not configured: PRIVATE_OBJECT_DIR environment variable is missing");
    }
    
    const [bucketName, ...pathParts] = privateDir.split("/").filter(Boolean);
    if (!bucketName) {
      throw new Error("Invalid object storage configuration: bucket name could not be determined");
    }
    
    const objectId = randomUUID();
    const fullPath = [...pathParts, objectId].join("/");
    
    // Use Replit's sidecar endpoint to sign URLs instead of GCS getSignedUrl
    const signedURL = await this.signObjectURL({
      bucketName,
      objectName: fullPath,
      method: "PUT",
      ttlSec: 900, // 15 minutes
    });
    
    return signedURL;
  }

  // Sign object URL using Replit's sidecar endpoint
  private async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec,
  }: {
    bucketName: string;
    objectName: string;
    method: "GET" | "PUT" | "DELETE" | "HEAD";
    ttlSec: number;
  }): Promise<string> {
    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };
    
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );
    
    if (!response.ok) {
      throw new Error(
        `Failed to sign object URL, status: ${response.status}. ` +
        `Make sure you're running on Replit.`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  normalizeObjectEntityPath(uploadURL: string): string {
    const url = new URL(uploadURL);
    const pathParts = url.pathname.split("/");
    const objectId = pathParts[pathParts.length - 1];
    return `/objects/${objectId}`;
  }

  downloadObject(file: File, res: Response): void {
    file
      .createReadStream()
      .on("error", (err) => {
        console.error("Error streaming file:", err);
        res.status(500).json({ error: "Failed to download file" });
      })
      .pipe(res);
  }
}
