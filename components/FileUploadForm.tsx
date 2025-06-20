"use client";

import { useState, useRef } from "react";
import { Button } from "@heroui/button";
import { Progress } from "@heroui/progress";
import { Input } from "@heroui/input";
import {
  Upload,
  X,
  FileUp,
  AlertTriangle,
  FolderPlus,
  ArrowRight,
} from "lucide-react";
import { addToast } from "@heroui/toast";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import axios from "axios";
/*
React hooks: useState, useRef for managing component state and refs.
HeroUI components: For consistent UI (buttons, inputs, progress bars, modals, toasts).
Lucide icons: For visual cues (upload, error, folder, etc.).
axios: For making HTTP requests to your API routes.
"use client": Marks this as a client component (required for hooks and interactivity in Next.js App Router).
*/

interface FileUploadFormProps {
  userId: string;
  onUploadSuccess?: () => void;
  currentFolder?: string | null;
}
/*
userId: The current user's ID (used for associating uploads/folders).
onUploadSuccess: Optional callback to refresh file/folder lists after upload/folder creation.
currentFolder: The ID of the folder the user is currently in (for nested uploads/folders).
*/

export default function FileUploadForm({
  userId,
  onUploadSuccess,
  currentFolder = null,
}: FileUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  /*
  File is a built-in TypeScript and JavaScript Web API type that represents a file object, such as one selected by a user via an <input type="file" /> element or dropped via drag-and-drop.

File extends the Blob interface and provides properties like name, size, type, and lastModified.
In this context, file will hold the file selected by the user for upload, or null if no file is selected.
Example usage:

When a user selects a file, the File object is stored in this state variable.
You can then access properties like file.name, file.size, and file.type for display or validation.
  */
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder creation state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    /*
    e is the name of the parameter (short for "event").
React.ChangeEvent<HTMLInputElement> is the type of the event object.
What does this mean?
This tells TypeScript that e is a change event coming from an <input> element (specifically, an <input type="file" /> in your case).
The event object e contains information about what changed, including:
e.target: The input element that triggered the event.
e.target.files: The list of files selected by the user.
Why use this type?
It gives you type safety and autocomplete in your editor.
You can safely access properties like e.target.files without TypeScript errors.

    */
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate file size (5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit");
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];

      // Validate file size (5MB limit)
      if (droppedFile.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit");
        return;
      }

      setFile(droppedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    /*
    FormData is a built-in JavaScript Web API for constructing a set of key/value pairs representing form fields and their values.
It is commonly used to send data, especially files, in HTTP requests with multipart/form-data encoding (which is required for file uploads
    */
    formData.append("file", file);
    formData.append("userId", userId);
    if (currentFolder) {
      formData.append("parentId", currentFolder);
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      await axios.post("/api/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          }
        },
      });

      addToast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully.`,
        color: "success",
      });

      // Clear the file after successful upload
      clearFile();

      // Call the onUploadSuccess callback if provided
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload file. Please try again.");
      addToast({
        title: "Upload Failed",
        description: "We couldn't upload your file. Please try again.",
        color: "danger",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      addToast({
        title: "Invalid Folder Name",
        description: "Please enter a valid folder name.",
        color: "danger",
      });
      return;
    }

    setCreatingFolder(true);

    try {
      await axios.post("/api/folders/create", {
        name: folderName.trim(),
        userId: userId,
        parentId: currentFolder,
      });

      addToast({
        title: "Folder Created",
        description: `Folder "${folderName}" has been created successfully.`,
        color: "success",
      });

      // Reset folder name and close modal
      setFolderName("");
      setFolderModalOpen(false);

      // Call the onUploadSuccess callback to refresh the file list
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      addToast({
        title: "Folder Creation Failed",
        description: "We couldn't create the folder. Please try again.",
        color: "danger",
      });
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2 mb-2">
        <Button
          color="primary"
          variant="flat"
          startContent={<FolderPlus className="h-4 w-4" />}
          onClick={() => setFolderModalOpen(true)}
          className="flex-1"
        >
          New Folder
        </Button>
        <Button
          color="primary"
          variant="flat"
          startContent={<FileUp className="h-4 w-4" />}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
        >
          Add Image
        </Button>
      </div>

      {/* File drop area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          error
            ? "border-danger/30 bg-danger/5"
            : file
              ? "border-primary/30 bg-primary/5"
              : "border-default-300 hover:border-primary/5"
        }`}
      >
        {!file ? (
          <div className="space-y-3">
            <FileUp className="h-12 w-12 mx-auto text-primary/70" />
            <div>
              <p className="text-default-600">
                Drag and drop your image here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary cursor-pointer font-medium inline bg-transparent border-0 p-0 m-0"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-default-500 mt-1">Images up to 5MB</p>
            </div>
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <FileUp className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[180px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-default-500">
                    {file.size < 1024
                      ? `${file.size} B`
                      : file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                  </p>
                </div>
              </div>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onClick={clearFile}
                className="text-default-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {error && (
              <div className="bg-danger-5 text-danger-700 p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {uploading && (
              <Progress
                value={progress}
                color="primary"
                size="sm"
                showValueLabel={true}
                className="max-w-full"
              />
            )}

            <Button
              color="primary"
              startContent={<Upload className="h-4 w-4" />}
              endContent={!uploading && <ArrowRight className="h-4 w-4" />}
              onClick={handleUpload}
              isLoading={uploading}
              className="w-full"
              isDisabled={!!error}
            >
              {uploading ? `Uploading... ${progress}%` : "Upload Image"}
            </Button>
          </div>
        )}
      </div>

      {/* Upload tips */}
      <div className="bg-default-100/5 p-4 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Tips</h4>
        <ul className="text-xs text-default-600 space-y-1">
          <li>• Images are private and only visible to you</li>
          <li>• Supported formats: JPG, PNG, GIF, WebP</li>
          <li>• Maximum file size: 5MB</li>
        </ul>
      </div>

      {/* Create Folder Modal */}
      <Modal
        isOpen={folderModalOpen}
        onOpenChange={setFolderModalOpen}
        backdrop="blur"
        classNames={{
          base: "border border-default-200 bg-default-5",
          header: "border-b border-default-200",
          footer: "border-t border-default-200",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            <FolderPlus className="h-5 w-5 text-primary" />
            <span>New Folder</span>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-default-600">
                Enter a name for your folder:
              </p>
              <Input
                type="text"
                label="Folder Name"
                placeholder="My Images"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              color="default"
              onClick={() => setFolderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleCreateFolder}
              isLoading={creatingFolder}
              isDisabled={!folderName.trim()}
              endContent={!creatingFolder && <ArrowRight className="h-4 w-4" />}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}