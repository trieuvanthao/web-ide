export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  children?: TreeNode[];
}

export interface GitStatus {
  branch: string | null;
  tracking: string | null;
  ahead: number;
  behind: number;
  created: string[];
  modified: string[];
  deleted: string[];
  renamed: { from: string; to: string }[];
  staged: string[];
  conflicted: string[];
}

export interface FileMeta {
  binary: boolean;
  base64?: string;
  tooLarge?: boolean;
}

export interface ModalState {
  title: string;
  placeholder: string;
  initial: string;
  onSubmit: (value: string) => void;
}
