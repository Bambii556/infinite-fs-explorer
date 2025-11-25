export interface Entry {
  name: string;
  path: string;
  size: number | null;
  isDirectory: boolean;
  created: number;
  modified: number;
  permissions: string;
  extension: string | null;
  type: "file" | "directory";
}
